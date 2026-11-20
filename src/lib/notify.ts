/**
 * WhatsApp notifications backed by the database.
 *
 * Guarantees
 *  - A notification failure NEVER throws into the booking flow (everything here catches and logs).
 *  - Each message is "claimed" by inserting a row with a UNIQUE dedupeKey BEFORE sending, so a retry,
 *    double click or concurrent request can never send it twice (at-most-once per key).
 *  - The daily doctor summary is claimed per Karachi date via the PRIMARY KEY on DailyReport.date.
 */
import { prisma } from './db';
import { getSettings } from './availability';
import { waNumber } from './contact';
import { nowInKarachi } from './schedule';
import { sendWhatsApp, type SendInput, type SendResult } from './whatsapp';
import { buildDailyReport, buildLateBooking, buildPatientConfirmation, type Built } from './messages';
import { decideReportClaim, shouldNotifyDoctorLate } from './report';

const code = (e: unknown) => (e as { code?: string } | null)?.code;
const isUnique = (e: unknown) => code(e) === 'P2002';
const short = (s?: string) => (s ? s.slice(0, 300) : null);

type Settings = Awaited<ReturnType<typeof getSettings>>;
type Appt = NonNullable<Awaited<ReturnType<typeof prisma.appointment.findUnique>>>;

function toInput(to: string, built: Built, templateEnv: string): SendInput {
  const name = process.env[templateEnv]?.trim();
  return name ? { to, template: { name, params: built.params } } : { to, text: built.text };
}

export const doctorNumber = (s: Settings) => waNumber(process.env.DOCTOR_WHATSAPP_NUMBER?.trim() || s.doctorPhone);

async function finish(id: string, r: SendResult) {
  await prisma.notificationLog.update({
    where: { id },
    data: r.ok
      ? { status: 'SENT', providerMessageId: r.messageId ?? null, error: null, sentAt: new Date() }
      : { status: 'FAILED', error: short(r.error) },
  });
}

async function claim(dedupeKey: string, kind: string, appointmentId: string, recipient: string) {
  try {
    return await prisma.notificationLog.create({ data: { dedupeKey, kind, appointmentId, recipient, status: 'PENDING', attempts: 1 } });
  } catch (e) {
    if (isUnique(e)) return null; // already claimed / sent
    throw e;
  }
}

function sendPatient(appt: Appt, s: Settings) {
  const built = buildPatientConfirmation({
    patientName: appt.patientName,
    code: appt.code,
    date: appt.date,
    startTime: appt.startTime,
    service: appt.service,
    clinicPhone: s.doctorPhone,
  });
  return sendWhatsApp(toInput(waNumber(appt.phone), built, 'WHATSAPP_TEMPLATE_PATIENT_CONFIRMATION'));
}

export type NotifyOutcome = 'sent' | 'failed' | 'duplicate' | 'skipped' | 'error';

/** Patient confirmation – exactly once per appointment. Safe to call from any code path. */
export async function notifyPatientConfirmed(appointmentId: string): Promise<NotifyOutcome> {
  try {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt || appt.status !== 'CONFIRMED') return 'skipped';
    const log = await claim(`patient_confirmation:${appt.id}`, 'PATIENT_CONFIRMATION', appt.id, waNumber(appt.phone));
    if (!log) return 'duplicate';
    const r = await sendPatient(appt, await getSettings());
    await finish(log.id, r);
    if (!r.ok) console.error(`[notify] patient confirmation ${appt.code} failed: ${r.error}`);
    return r.ok ? 'sent' : 'failed';
  } catch (e) {
    console.error('[notify] patient confirmation error', e);
    return 'error';
  }
}

/** Admin-triggered resend: only when the previous attempt FAILED (never re-sends a delivered message). */
export async function resendPatientConfirmation(appointmentId: string): Promise<NotifyOutcome> {
  try {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt || appt.status !== 'CONFIRMED') return 'skipped';
    const log = await prisma.notificationLog.findUnique({ where: { dedupeKey: `patient_confirmation:${appt.id}` } });
    if (!log) return notifyPatientConfirmed(appointmentId);
    const won = await prisma.notificationLog.updateMany({
      where: { id: log.id, status: { in: ['FAILED', 'SKIPPED'] }, attempts: log.attempts },
      data: { status: 'PENDING', attempts: { increment: 1 } },
    });
    if (won.count !== 1) return 'duplicate';
    const r = await sendPatient(appt, await getSettings());
    await finish(log.id, r);
    return r.ok ? 'sent' : 'failed';
  } catch (e) {
    console.error('[notify] resend error', e);
    return 'error';
  }
}

/**
 * Re-tries confirmations that FAILED (e.g. temporary Meta outage). Max 3 attempts per message, only for
 * appointments still CONFIRMED and still in the future, and only within 12 hours of booking.
 * Each retry is claimed with a compare-and-swap so two workers cannot send the same message.
 */
export async function retryFailedPatientConfirmations(now: Date = new Date()): Promise<number> {
  let sent = 0;
  try {
    const rows = await prisma.notificationLog.findMany({
      where: { kind: 'PATIENT_CONFIRMATION', status: 'FAILED', attempts: { lt: 3 }, createdAt: { gte: new Date(now.getTime() - 12 * 3600_000) } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    const settings = rows.length ? await getSettings() : null;
    const today = nowInKarachi(now).date;
    for (const row of rows) {
      const won = await prisma.notificationLog.updateMany({
        where: { id: row.id, status: 'FAILED', attempts: row.attempts },
        data: { status: 'PENDING', attempts: { increment: 1 } },
      });
      if (won.count !== 1) continue;
      const appt = row.appointmentId ? await prisma.appointment.findUnique({ where: { id: row.appointmentId } }) : null;
      if (!appt || appt.status !== 'CONFIRMED' || appt.date < today) {
        await prisma.notificationLog.update({ where: { id: row.id }, data: { status: 'SKIPPED', error: 'Appointment no longer eligible' } });
        continue;
      }
      const r = await sendPatient(appt, settings!);
      await finish(row.id, r);
      if (r.ok) sent++;
    }
  } catch (e) {
    console.error('[notify] retry sweep error', e);
  }
  return sent;
}

/** Extra notice to the doctor when a booking for TODAY arrives after the 4 PM summary was sent. */
export async function notifyDoctorLateBooking(appointmentId: string, now: Date = new Date()): Promise<NotifyOutcome> {
  try {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt || appt.status !== 'CONFIRMED') return 'skipped';
    const today = nowInKarachi(now).date;
    if (appt.date !== today) return 'skipped';
    const report = await prisma.dailyReport.findUnique({ where: { date: today } });
    if (!shouldNotifyDoctorLate(appt, today, report)) return 'skipped';

    const settings = await getSettings();
    const to = doctorNumber(settings);
    const log = await claim(`doctor_late:${appt.id}`, 'DOCTOR_LATE_BOOKING', appt.id, to);
    if (!log) return 'duplicate';
    const totalToday = await prisma.appointment.count({ where: { date: today, status: 'CONFIRMED' } });
    const built = buildLateBooking({ patientName: appt.patientName, startTime: appt.startTime, phone: appt.phone, service: appt.service, code: appt.code, totalToday });
    const r = await sendWhatsApp(toInput(to, built, 'WHATSAPP_TEMPLATE_DOCTOR_LATE'));
    await finish(log.id, r);
    if (!r.ok) console.error(`[notify] doctor late notice ${appt.code} failed: ${r.error}`);
    return r.ok ? 'sent' : 'failed';
  } catch (e) {
    console.error('[notify] doctor late notice error', e);
    return 'error';
  }
}

export interface DailyReportOutcome {
  status: 'sent' | 'failed' | 'too-early' | 'already-sent' | 'in-progress' | 'give-up' | 'error';
  date: string;
  total?: number;
  error?: string;
}

/**
 * 4 PM summary for TODAY (Asia/Karachi). Idempotent: callable any number of times; sends at most once
 * per date, retries a FAILED or crashed run (max 5 attempts), and never runs before 4:00 PM Karachi time.
 */
export async function runDailyReport(now: Date = new Date()): Promise<DailyReportOutcome> {
  const { date, minutes } = nowInKarachi(now);
  try {
    const existing = await prisma.dailyReport.findUnique({ where: { date } });
    const decision = decideReportClaim(minutes, existing, now);
    if (decision !== 'create' && decision !== 'retry') return { status: decision, date };

    if (decision === 'create') {
      try {
        await prisma.dailyReport.create({ data: { date, status: 'SENDING', attempts: 1 } });
      } catch (e) {
        if (isUnique(e)) return { status: 'in-progress', date }; // another run claimed it first
        throw e;
      }
    } else {
      const won = await prisma.dailyReport.updateMany({
        where: { date, status: existing!.status, updatedAt: existing!.updatedAt },
        data: { status: 'SENDING', attempts: { increment: 1 } },
      });
      if (won.count !== 1) return { status: 'in-progress', date };
    }

    const appts = await prisma.appointment.findMany({
      where: { date, status: 'CONFIRMED' },
      orderBy: { startTime: 'asc' },
      select: { patientName: true, startTime: true, phone: true, service: true, code: true },
    });
    const built = buildDailyReport(date, appts);
    const settings = await getSettings();
    const r = await sendWhatsApp(toInput(doctorNumber(settings), built, 'WHATSAPP_TEMPLATE_DOCTOR_DAILY'));

    await prisma.dailyReport.update({
      where: { date },
      data: r.ok
        ? { status: 'SENT', total: built.total, providerMessageId: r.messageId ?? null, error: null, sentAt: new Date() }
        : { status: 'FAILED', total: built.total, error: short(r.error) },
    });
    if (!r.ok) console.error(`[daily-report] ${date} failed: ${r.error}`);
    return r.ok ? { status: 'sent', date, total: built.total } : { status: 'failed', date, total: built.total, error: r.error };
  } catch (e) {
    console.error('[daily-report] error', e);
    return { status: 'error', date };
  }
}
