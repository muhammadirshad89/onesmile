/** Pure builders for WhatsApp message content (no I/O – fully unit-tested). */
import { formatDateLong, formatTime12 } from './schedule';
import { serviceShortTitle } from './services';

export const CLINIC_NAME = 'One Smile Dental Studio';
export const WA_ADDRESS = '4 C, D.H.A. Phase 7, Sehar Commercial Area, Karachi.';

/**
 * Template variable values must be single-line (no newlines/tabs, no runs of 4+ spaces) or Meta rejects
 * the send with error 132018. Empty values are rejected too, so fall back to "-".
 */
export function cleanParam(v: string, max = 200): string {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  return s || '-';
}

/** "5:00 PM" -> "05:00 PM" (matches the layout requested for the doctor's list) */
export const time12Padded = (t: string) => formatTime12(t).replace(/^(\d):/, '0$1:');

export interface Built {
  params: string[];
  text: string;
}

export interface PatientMsgInput {
  patientName: string;
  code: string;
  date: string;
  startTime: string;
  service: string;
  clinicPhone: string;
}

/** Template body to create in Meta (variables {{1}}–{{7}}) is documented in README.md. */
export function buildPatientConfirmation(i: PatientMsgInput): Built {
  const name = cleanParam(i.patientName, 80);
  const date = formatDateLong(i.date);
  const time = formatTime12(i.startTime);
  const service = serviceShortTitle(i.service);
  return {
    params: [name, cleanParam(i.code), date, time, service, WA_ADDRESS, cleanParam(i.clinicPhone, 30)].map((p) => cleanParam(p)),
    text: [
      `Hello ${name},`,
      '',
      `Your appointment at ${CLINIC_NAME} has been successfully CONFIRMED!`,
      '',
      `Appointment ID: ${i.code}`,
      `Date: ${date}`,
      `Time: ${time}`,
      `Service: ${service}`,
      '',
      `Address: ${WA_ADDRESS}`,
      '',
      `For assistance, contact us at ${i.clinicPhone}.`,
      '',
      `Thank you for choosing ${CLINIC_NAME}!`,
    ].join('\n'),
  };
}

export interface ReportAppt {
  patientName: string;
  startTime: string;
  phone: string;
  service: string;
  code: string;
}

/** Max characters for the {{3}} list variable, keeping the whole template body under WhatsApp's 1024 limit. */
const LIST_BUDGET = 640;

export interface DailyReportBuilt extends Built {
  total: number;
}

export function buildDailyReport(date: string, appts: ReportAppt[]): DailyReportBuilt {
  const total = appts.length;
  const dateLong = formatDateLong(date);

  // single-line list for the template variable
  const entries = appts.map((a, i) => `${i + 1}) ${cleanParam(a.patientName, 60)}, ${time12Padded(a.startTime)}, ${a.phone}, ${serviceShortTitle(a.service)}, ID ${a.code}`);
  let list = '';
  let shown = 0;
  for (const e of entries) {
    const next = list ? `${list} | ${e}` : e;
    if (next.length > LIST_BUDGET) break;
    list = next;
    shown++;
  }
  if (shown < total) list += `${list ? ' | ' : ''}+${total - shown} more - please check the admin dashboard`;
  if (!list) list = 'No confirmed appointments are scheduled for today.';

  const text =
    total === 0
      ? ['Good Afternoon Doctor Ayesha!', '', `No confirmed appointments are scheduled for today (${dateLong}).`, '', 'Have a wonderful day!', '', CLINIC_NAME].join('\n')
      : [
          'Good Afternoon Doctor Ayesha!',
          '',
          `Here is your ${CLINIC_NAME} appointment schedule for today.`,
          '',
          `Date: ${dateLong}`,
          `Total Confirmed Appointments: ${total}`,
          '',
          ...appts.flatMap((a, i) => [
            `${i + 1}. ${cleanParam(a.patientName, 80)}`,
            `Time: ${time12Padded(a.startTime)}`,
            `Phone: ${a.phone}`,
            `Service: ${serviceShortTitle(a.service)}`,
            `ID: ${a.code}`,
            '',
          ]),
          'Have a wonderful day!',
          '',
          CLINIC_NAME,
        ].join('\n');

  return { total, params: [cleanParam(dateLong), String(total), list], text };
}

export interface LateMsgInput extends ReportAppt {
  totalToday: number;
}

/** Sent to the doctor when a booking for TODAY is made after the 4 PM summary already went out. */
export function buildLateBooking(i: LateMsgInput): Built {
  const name = cleanParam(i.patientName, 80);
  const time = time12Padded(i.startTime);
  const service = serviceShortTitle(i.service);
  return {
    params: [name, time, i.phone, service, i.code, String(i.totalToday)].map((p) => cleanParam(p)),
    text: [
      'Update for Doctor Ayesha:',
      '',
      `A new appointment was just confirmed for today, after the daily schedule was sent.`,
      '',
      `Patient: ${name}`,
      `Time: ${time}`,
      `Phone: ${i.phone}`,
      `Service: ${service}`,
      `ID: ${i.code}`,
      '',
      `Total confirmed appointments today: ${i.totalToday}`,
      '',
      CLINIC_NAME,
    ].join('\n'),
  };
}
