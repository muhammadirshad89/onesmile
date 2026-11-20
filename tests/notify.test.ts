/**
 * Runs the REAL src/lib/notify.ts against an in-memory database stand-in (tests/helpers/fake-prisma.ts)
 * with a mocked network. Run with:  tsx --tsconfig tests/tsconfig.fake.json tests/notify.test.ts
 */
import assert from 'node:assert/strict';
import { test, done } from './harness';
import { prisma } from '../src/lib/db';
import { notifyPatientConfirmed, notifyDoctorLateBooking, runDailyReport, retryFailedPatientConfirmations, resendPatientConfirmation } from '../src/lib/notify';
import { CONSULTATION } from '../src/lib/services';

const db = prisma as any;
const TOKEN = 'EAAB_SUPER_SECRET_TOKEN';
const setEnv = () => {
  process.env.WHATSAPP_ACCESS_TOKEN = TOKEN;
  process.env.WHATSAPP_PHONE_NUMBER_ID = '555';
  process.env.WHATSAPP_TEMPLATE_PATIENT_CONFIRMATION = 'appointment_confirmed';
  process.env.WHATSAPP_TEMPLATE_DOCTOR_DAILY = 'doctor_daily_schedule';
  process.env.WHATSAPP_TEMPLATE_DOCTOR_LATE = 'doctor_new_booking';
  delete process.env.DOCTOR_WHATSAPP_NUMBER;
};

// ---- mocked network -------------------------------------------------------------------------------------
let mode: 'ok' | 'http500' | 'throw' = 'ok';
const calls: { to: string; body: any; auth: string }[] = [];
globalThis.fetch = (async (_url: any, init: any) => {
  const body = JSON.parse(init.body);
  calls.push({ to: body.to, body, auth: init.headers.Authorization });
  if (mode === 'throw') throw new TypeError('fetch failed');
  if (mode === 'http500') return new Response(JSON.stringify({ error: { code: 131000, message: 'Something went wrong' } }), { status: 500 });
  return new Response(JSON.stringify({ messages: [{ id: `wamid.${calls.length}` }] }), { status: 200 });
}) as any;
const reset = () => {
  db.appointment.rows.length = 0;
  db.notificationLog.rows.length = 0;
  db.dailyReport.rows.length = 0;
  calls.length = 0;
  mode = 'ok';
  setEnv();
};

let n = 0;
const mk = (o: Partial<Record<string, any>> = {}) =>
  db.appointment.create({
    data: { code: `OSD-T${++n}`, patientName: `Patient ${n}`, phone: '03001234567', service: 'general-dentistry', date: '2026-11-20', startTime: '17:00', endTime: '17:30', status: 'CONFIRMED', slotKey: `2026-11-20T17:00#${n}`, ...o },
  });

const T = (h: number, m = 0, day = 20) => new Date(Date.UTC(2026, 10, day, h, m)); // UTC clock; 11:00Z = 4:00 PM Karachi

(async () => {
  console.log('patient confirmation (real notify.ts, in-memory DB, mocked WhatsApp)');

  await test('sent exactly once even when called 6x concurrently (retry / double submit)', async () => {
    reset();
    const a = await mk();
    const out = await Promise.all(Array.from({ length: 6 }, () => notifyPatientConfirmed(a.id)));
    assert.equal(calls.length, 1);
    assert.equal(out.filter((o) => o === 'sent').length, 1);
    assert.equal(out.filter((o) => o === 'duplicate').length, 5);
    assert.equal(db.notificationLog.rows.length, 1);
    assert.equal(db.notificationLog.rows[0].status, 'SENT');
    assert.ok(db.notificationLog.rows[0].providerMessageId);
    // calling again later still does nothing
    assert.equal(await notifyPatientConfirmed(a.id), 'duplicate');
    assert.equal(calls.length, 1);
  });

  await test('message goes to the normalised number with template + all appointment fields', async () => {
    reset();
    const a = await mk({ patientName: 'Sara Khan', phone: '0300-1234567', code: 'OSD-261120-ZZZZZ', startTime: '18:30' });
    await notifyPatientConfirmed(a.id);
    const c = calls[0];
    assert.equal(c.to, '923001234567');
    assert.equal(c.auth, `Bearer ${TOKEN}`);
    assert.equal(c.body.template.name, 'appointment_confirmed');
    const p = c.body.template.components[0].parameters.map((x: any) => x.text);
    assert.deepEqual(p, ['Sara Khan', 'OSD-261120-ZZZZZ', 'Friday, 20 November 2026', '6:30 PM', 'General Dentistry', '4 C, D.H.A. Phase 7, Sehar Commercial Area, Karachi.', '0332-3259577']);
  });

  await test('"Not Sure" bookings are confirmed and messaged like any other service', async () => {
    reset();
    const a = await mk({ service: CONSULTATION.slug });
    assert.equal(await notifyPatientConfirmed(a.id), 'sent');
    assert.equal(calls[0].body.template.components[0].parameters[4].text, 'Not Sure – Dental Consultation');
  });

  await test('without a template name the plain-text fallback is used', async () => {
    reset();
    delete process.env.WHATSAPP_TEMPLATE_PATIENT_CONFIRMATION;
    const a = await mk();
    await notifyPatientConfirmed(a.id);
    assert.equal(calls[0].body.type, 'text');
    assert.ok(calls[0].body.text.body.includes('successfully CONFIRMED'));
  });

  await test('WhatsApp failure (HTTP 500) never throws and never touches the appointment', async () => {
    reset();
    mode = 'http500';
    const a = await mk();
    assert.equal(await notifyPatientConfirmed(a.id), 'failed');
    const appt = await db.appointment.findUnique({ where: { id: a.id } });
    assert.equal(appt.status, 'CONFIRMED');
    assert.equal(appt.slotKey, a.slotKey);
    const log = db.notificationLog.rows[0];
    assert.equal(log.status, 'FAILED');
    assert.ok(log.error.includes('131000'));
    assert.ok(!JSON.stringify(log).includes(TOKEN), 'token must never be stored');
  });

  await test('network exception is contained as well', async () => {
    reset();
    mode = 'throw';
    const a = await mk();
    assert.equal(await notifyPatientConfirmed(a.id), 'failed');
    assert.equal((await db.appointment.findUnique({ where: { id: a.id } })).status, 'CONFIRMED');
  });

  await test('WhatsApp not configured: no request is made, appointment untouched, status recorded', async () => {
    reset();
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const a = await mk();
    assert.equal(await notifyPatientConfirmed(a.id), 'failed');
    assert.equal(calls.length, 0);
    assert.match(db.notificationLog.rows[0].error, /not configured/);
    assert.equal((await db.appointment.findUnique({ where: { id: a.id } })).status, 'CONFIRMED');
  });

  await test('database error inside notification is swallowed (returns "error", never throws)', async () => {
    reset();
    const orig = db.notificationLog.create;
    db.notificationLog.create = async () => { throw Object.assign(new Error('db down'), { code: 'P1001' }); };
    const a = await mk();
    assert.equal(await notifyPatientConfirmed(a.id), 'error');
    db.notificationLog.create = orig;
  });

  await test('pending / unknown appointments are never messaged', async () => {
    reset();
    const a = await mk({ status: 'PENDING' });
    assert.equal(await notifyPatientConfirmed(a.id), 'skipped');
    assert.equal(await notifyPatientConfirmed('nope'), 'skipped');
    assert.equal(calls.length, 0);
  });

  await test('failed confirmation is retried by the sweep, then never duplicated', async () => {
    reset();
    mode = 'http500';
    const a = await mk({ date: '2026-11-21' });
    await notifyPatientConfirmed(a.id); // attempt 1 fails
    mode = 'ok';
    assert.equal(await retryFailedPatientConfirmations(), 1); // attempt 2 succeeds
    assert.equal(await retryFailedPatientConfirmations(), 0); // nothing left to retry
    assert.equal(calls.length, 2);
    assert.equal(db.notificationLog.rows[0].status, 'SENT');
    assert.equal(db.notificationLog.rows[0].attempts, 2);
  });

  await test('retries stop after 3 attempts', async () => {
    reset();
    mode = 'http500';
    const a = await mk({ date: '2026-11-21' });
    await notifyPatientConfirmed(a.id);
    await retryFailedPatientConfirmations();
    await retryFailedPatientConfirmations();
    await retryFailedPatientConfirmations();
    assert.equal(calls.length, 3);
  });

  await test('retry sweep skips appointments that were cancelled meanwhile', async () => {
    reset();
    mode = 'http500';
    const a = await mk({ date: '2026-11-21' });
    await notifyPatientConfirmed(a.id);
    await db.appointment.update({ where: { id: a.id }, data: { status: 'CANCELLED' } });
    mode = 'ok';
    assert.equal(await retryFailedPatientConfirmations(), 0);
    assert.equal(calls.length, 1);
    assert.equal(db.notificationLog.rows[0].status, 'SKIPPED');
  });

  await test('admin "Resend" works only after a failure, never after a delivered message', async () => {
    reset();
    const a = await mk();
    await notifyPatientConfirmed(a.id);
    assert.equal(await resendPatientConfirmation(a.id), 'duplicate');
    assert.equal(calls.length, 1);
    db.notificationLog.rows[0].status = 'FAILED';
    assert.equal(await resendPatientConfirmation(a.id), 'sent');
    assert.equal(calls.length, 2);
  });

  console.log('daily 4 PM report');

  await test('multiple appointments: only today + CONFIRMED, sorted by time, sent to the doctor once', async () => {
    reset();
    await mk({ patientName: 'Zed Late', startTime: '19:00' });
    await mk({ patientName: 'Amy Early', startTime: '17:00', service: CONSULTATION.slug });
    await mk({ patientName: 'Mid One', startTime: '18:00' });
    await mk({ patientName: 'Cancelled C', status: 'CANCELLED' });
    await mk({ patientName: 'Rejected R', status: 'REJECTED' });
    await mk({ patientName: 'Pending P', status: 'PENDING' });
    await mk({ patientName: 'Tomorrow T', date: '2026-11-21' });
    await mk({ patientName: 'Booked Days Ago', startTime: '20:00', createdAt: new Date('2026-11-15') });

    const r = await runDailyReport(T(11, 0)); // exactly 4:00 PM Karachi
    assert.equal(r.status, 'sent');
    assert.equal(r.total, 4);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].to, '923323259577'); // doctor, from settings
    const [date, total, list] = calls[0].body.template.components[0].parameters.map((x: any) => x.text);
    assert.equal(date, 'Friday, 20 November 2026');
    assert.equal(total, '4');
    for (const good of ['Amy Early', 'Mid One', 'Zed Late', 'Booked Days Ago']) assert.ok(list.includes(good), good);
    for (const bad of ['Cancelled C', 'Rejected R', 'Pending P', 'Tomorrow T']) assert.ok(!list.includes(bad), bad);
    assert.ok(list.includes('Not Sure – Dental Consultation'));
    assert.ok(list.indexOf('Amy Early') < list.indexOf('Mid One') && list.indexOf('Mid One') < list.indexOf('Zed Late'));
    assert.equal(db.dailyReport.rows[0].status, 'SENT');
  });

  await test('empty schedule still sends a short "no appointments" message', async () => {
    reset();
    const r = await runDailyReport(T(11, 0));
    assert.equal(r.status, 'sent');
    assert.equal(r.total, 0);
    const p = calls[0].body.template.components[0].parameters.map((x: any) => x.text);
    assert.equal(p[1], '0');
    assert.match(p[2], /No confirmed appointments are scheduled for today/);
  });

  await test('does nothing before 4:00 PM Karachi (3:59 PM) and creates no record', async () => {
    reset();
    await mk();
    const r = await runDailyReport(T(10, 59));
    assert.equal(r.status, 'too-early');
    assert.equal(calls.length, 0);
    assert.equal(db.dailyReport.rows.length, 0);
  });

  await test('a new Karachi day starts at 19:00 UTC: 00:05 PKT is "too early" for the NEW date', async () => {
    reset();
    const r = await runDailyReport(T(19, 5));
    assert.equal(r.date, '2026-11-21');
    assert.equal(r.status, 'too-early');
  });

  await test('cannot be sent twice: 8 concurrent scheduler runs + later retries => exactly ONE message', async () => {
    reset();
    await mk();
    const out = await Promise.all(Array.from({ length: 8 }, () => runDailyReport(T(11, 0))));
    assert.equal(calls.length, 1);
    assert.equal(out.filter((o) => o.status === 'sent').length, 1);
    assert.ok(out.every((o) => ['sent', 'in-progress', 'already-sent'].includes(o.status)));
    assert.equal((await runDailyReport(T(12, 0))).status, 'already-sent'); // the 5 PM safety-net cron
    assert.equal((await runDailyReport(T(18, 0))).status, 'already-sent');
    assert.equal(calls.length, 1);
  });

  await test('failed send is retried by the next run, then not repeated', async () => {
    reset();
    await mk();
    mode = 'http500';
    assert.equal((await runDailyReport(T(11, 0))).status, 'failed');
    assert.equal(db.dailyReport.rows[0].status, 'FAILED');
    mode = 'ok';
    assert.equal((await runDailyReport(T(12, 0))).status, 'sent');
    assert.equal((await runDailyReport(T(12, 1))).status, 'already-sent');
    assert.equal(calls.length, 2);
    assert.equal(db.dailyReport.rows[0].attempts, 2);
  });

  await test('gives up after 5 failed attempts (no endless retries)', async () => {
    reset();
    mode = 'http500';
    const results: string[] = [];
    for (let i = 0; i < 7; i++) results.push((await runDailyReport(T(11, i))).status);
    assert.deepEqual(results.slice(0, 5), ['failed', 'failed', 'failed', 'failed', 'failed']);
    assert.equal(results[5], 'give-up');
    assert.equal(calls.length, 5);
  });

  await test('a crashed run (stale SENDING) is recovered; a fresh SENDING is left alone', async () => {
    reset();
    const t = T(11, 30);
    await db.dailyReport.create({ data: { date: '2026-11-20', status: 'SENDING', attempts: 1 } });
    db.dailyReport.rows[0].updatedAt = new Date(t.getTime() - 60_000); // 1 minute ago
    assert.equal((await runDailyReport(t)).status, 'in-progress');
    assert.equal(calls.length, 0);
    db.dailyReport.rows[0].updatedAt = new Date(t.getTime() - 11 * 60_000); // crashed 11 minutes ago
    assert.equal((await runDailyReport(t)).status, 'sent');
    assert.equal(calls.length, 1);
  });

  await test('DOCTOR_WHATSAPP_NUMBER overrides the settings number', async () => {
    reset();
    process.env.DOCTOR_WHATSAPP_NUMBER = '0311-1112223';
    await runDailyReport(T(11, 0));
    assert.equal(calls[0].to, '923111112223');
  });

  console.log('late bookings (after the 4 PM report)');

  await test('booking for today AFTER the report went out => one extra notice to the doctor, never duplicated', async () => {
    reset();
    await mk({ patientName: 'Early Bird' });
    await runDailyReport(T(11, 0));
    calls.length = 0;
    const late = await mk({ patientName: 'Late Lee', startTime: '19:30', createdAt: new Date(T(11, 20)) });
    assert.equal(await notifyDoctorLateBooking(late.id, T(11, 21)), 'sent');
    assert.equal(await notifyDoctorLateBooking(late.id, T(11, 22)), 'duplicate');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].to, '923323259577');
    const p = calls[0].body.template.components[0].parameters.map((x: any) => x.text);
    assert.equal(p[0], 'Late Lee');
    assert.equal(p[1], '07:30 PM');
    assert.equal(p[5], '2'); // total confirmed today now
    assert.equal(calls[0].body.template.name, 'doctor_new_booking');
  });

  await test('no extra notice before the report (it will be included) or for other dates', async () => {
    reset();
    const a = await mk({ createdAt: new Date(T(10, 0)) });
    assert.equal(await notifyDoctorLateBooking(a.id, T(10, 1)), 'skipped');
    await runDailyReport(T(11, 0));
    const tomorrow = await mk({ date: '2026-11-21', createdAt: new Date(T(11, 20)) });
    assert.equal(await notifyDoctorLateBooking(tomorrow.id, T(11, 21)), 'skipped');
    assert.equal(calls.length, 1); // only the daily report
  });

  done();
})();
