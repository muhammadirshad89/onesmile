import assert from 'node:assert/strict';
import { test, done } from './harness';
import { decideReportClaim, shouldNotifyDoctorLate, REPORT_AT_MINUTES, MAX_REPORT_ATTEMPTS, STALE_SENDING_MS } from '../src/lib/report';
import { nowInKarachi } from '../src/lib/schedule';
import { bookingSchema } from '../src/lib/validation';
import { BOOKING_SERVICES, SERVICES, CONSULTATION, serviceTitle } from '../src/lib/services';

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(Date.UTC(y, m - 1, d, h, min));
const now = new Date('2026-11-20T11:30:00Z');

(async () => {
  console.log('report scheduling & timezone');
  await test('4:00 PM Karachi is 11:00 UTC (no DST in Pakistan)', () => {
    assert.equal(nowInKarachi(at(2026, 11, 20, 11, 0)).minutes, REPORT_AT_MINUTES);
    assert.equal(nowInKarachi(at(2026, 11, 20, 10, 59)).minutes, REPORT_AT_MINUTES - 1);
    assert.equal(nowInKarachi(at(2026, 7, 20, 11, 0)).minutes, REPORT_AT_MINUTES); // summer too
  });
  await test('Karachi date rolls over at 19:00 UTC, not at UTC midnight', () => {
    assert.equal(nowInKarachi(at(2026, 11, 20, 18, 59)).date, '2026-11-20');
    assert.equal(nowInKarachi(at(2026, 11, 20, 19, 0)).date, '2026-11-21');
    assert.equal(nowInKarachi(at(2026, 11, 20, 0, 30)).date, '2026-11-20'); // 5:30 AM Karachi
  });
  await test('never sends before 4:00 PM, even if a row already exists', () => {
    assert.equal(decideReportClaim(15 * 60 + 59, null, now), 'too-early');
    assert.equal(decideReportClaim(10 * 60, { status: 'FAILED', attempts: 1, updatedAt: now }, now), 'too-early');
  });
  await test('first run at/after 4 PM creates the report', () => {
    assert.equal(decideReportClaim(REPORT_AT_MINUTES, null, now), 'create');
    assert.equal(decideReportClaim(22 * 60, null, now), 'create');
  });
  await test('already SENT => never sent again (duplicate scheduler runs)', () => {
    assert.equal(decideReportClaim(17 * 60, { status: 'SENT', attempts: 1, updatedAt: now }, now), 'already-sent');
  });
  await test('fresh SENDING => in-progress; stale SENDING => retry', () => {
    assert.equal(decideReportClaim(17 * 60, { status: 'SENDING', attempts: 1, updatedAt: new Date(now.getTime() - 60_000) }, now), 'in-progress');
    assert.equal(decideReportClaim(17 * 60, { status: 'SENDING', attempts: 1, updatedAt: new Date(now.getTime() - STALE_SENDING_MS - 1) }, now), 'retry');
  });
  await test('FAILED retries until the attempt cap, then gives up', () => {
    assert.equal(decideReportClaim(17 * 60, { status: 'FAILED', attempts: 1, updatedAt: now }, now), 'retry');
    assert.equal(decideReportClaim(17 * 60, { status: 'FAILED', attempts: MAX_REPORT_ATTEMPTS, updatedAt: now }, now), 'give-up');
  });
  await test('late-booking notice: only for TODAY, only once the summary has been claimed, only for newer bookings', () => {
    const rep = { status: 'SENT', createdAt: new Date('2026-11-20T11:00:00Z') };
    const mk = (date: string, iso: string) => ({ date, createdAt: new Date(iso) });
    assert.equal(shouldNotifyDoctorLate(mk('2026-11-20', '2026-11-20T11:20:00Z'), '2026-11-20', rep), true);
    assert.equal(shouldNotifyDoctorLate(mk('2026-11-21', '2026-11-20T11:20:00Z'), '2026-11-20', rep), false); // tomorrow
    assert.equal(shouldNotifyDoctorLate(mk('2026-11-20', '2026-11-19T09:00:00Z'), '2026-11-20', rep), false); // booked days ago: already in the list
    assert.equal(shouldNotifyDoctorLate(mk('2026-11-20', '2026-11-20T11:20:00Z'), '2026-11-20', null), false); // report not sent yet: it will include it
    assert.equal(shouldNotifyDoctorLate(mk('2026-11-20', '2026-11-20T11:20:00Z'), '2026-11-20', { ...rep, status: 'FAILED' }), false);
    assert.equal(shouldNotifyDoctorLate(mk('2026-11-20', '2026-11-20T11:00:30Z'), '2026-11-20', { ...rep, status: 'SENDING' }), true);
  });

  console.log('services & booking validation');
  const valid = (service: string) => ({ fullName: 'Sara Khan', phone: '0300-1234567', service, date: '2026-11-23', time: '17:00', submissionKey: 'abcdefghijklmnop' });
  await test('every service option passes booking validation', () => {
    assert.equal(BOOKING_SERVICES.length, 6);
    for (const s of BOOKING_SERVICES) assert.ok(bookingSchema.safeParse(valid(s.slug)).success, s.slug);
  });
  await test('"Not Sure – I Need a Dental Consultation" is selectable, last, and stored as its slug', () => {
    const p = bookingSchema.safeParse(valid(CONSULTATION.slug));
    assert.ok(p.success && p.data.service === 'not-sure-consultation');
    assert.equal(BOOKING_SERVICES.at(-1)!.title, 'Not Sure – I Need a Dental Consultation');
    assert.equal(serviceTitle(CONSULTATION.slug), 'Not Sure – I Need a Dental Consultation');
  });
  await test('unknown service is rejected; public Services list still shows only the 5 treatments', () => {
    assert.equal(bookingSchema.safeParse(valid('teeth-whitening')).success, false);
    assert.equal(SERVICES.length, 5);
    assert.ok(!SERVICES.some((s) => s.slug === CONSULTATION.slug));
  });
  done();
})();
