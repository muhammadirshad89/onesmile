import assert from 'node:assert/strict';
import { test, done } from './harness';
import { buildPatientConfirmation, buildDailyReport, buildLateBooking, cleanParam, time12Padded } from '../src/lib/messages';
import { CONSULTATION } from '../src/lib/services';

const singleLine = (s: string) => !/[\n\r\t]/.test(s) && !/ {4,}/.test(s) && s.trim().length > 0;

(async () => {
  console.log('messages');
  await test('cleanParam strips newlines/tabs/long space runs and never returns empty', () => {
    assert.equal(cleanParam('Ali\nKhan\t  Jr'), 'Ali Khan Jr');
    assert.equal(cleanParam('   '), '-');
    assert.ok(singleLine(cleanParam('a        b')));
  });
  await test('patient confirmation contains every required field', () => {
    const m = buildPatientConfirmation({ patientName: 'Sara Khan', code: 'OSD-261120-K7QX2', date: '2026-11-20', startTime: '17:30', service: 'wisdom-tooth-removal', clinicPhone: '0332-3259577' });
    for (const s of ['Hello Sara Khan,', 'successfully CONFIRMED', 'OSD-261120-K7QX2', 'Friday, 20 November 2026', '5:30 PM', 'Wisdom Tooth Removal', '4 C, D.H.A. Phase 7, Sehar Commercial Area, Karachi.', '0332-3259577', 'One Smile Dental Studio']) {
      assert.ok(m.text.includes(s), `missing: ${s}`);
    }
    assert.equal(m.params.length, 7);
    assert.ok(m.params.every(singleLine));
  });
  await test('"Not Sure" service is rendered as a consultation, not a raw slug', () => {
    const m = buildPatientConfirmation({ patientName: 'A B', code: 'X', date: '2026-11-20', startTime: '17:00', service: CONSULTATION.slug, clinicPhone: '0332-3259577' });
    assert.ok(m.text.includes('Service: Not Sure – Dental Consultation'));
    assert.ok(!m.text.includes('not-sure-consultation'));
  });
  await test('hostile name cannot inject newlines into template params', () => {
    const m = buildPatientConfirmation({ patientName: 'Eve\n\nCLICK http://evil', code: 'X', date: '2026-11-20', startTime: '17:00', service: 'general-dentistry', clinicPhone: '0332-3259577' });
    assert.ok(m.params.every(singleLine));
  });
  await test('time12Padded matches the doctor-list format (05:00 PM)', () => {
    assert.equal(time12Padded('17:00'), '05:00 PM');
    assert.equal(time12Padded('20:30'), '08:30 PM');
  });
  await test('daily report: multiple appointments, ordered, with totals and all fields', () => {
    const r = buildDailyReport('2026-11-20', [
      { patientName: 'Ali Raza', startTime: '17:00', phone: '03001234567', service: 'general-dentistry', code: 'OSD-1' },
      { patientName: 'Sara Khan', startTime: '17:30', phone: '03111234567', service: CONSULTATION.slug, code: 'OSD-2' },
    ]);
    assert.equal(r.total, 2);
    assert.equal(r.params[1], '2');
    assert.ok(r.text.includes('Total Confirmed Appointments: 2'));
    assert.ok(r.text.includes('1. Ali Raza\nTime: 05:00 PM\nPhone: 03001234567\nService: General Dentistry\nID: OSD-1'));
    assert.ok(r.text.includes('2. Sara Khan\nTime: 05:30 PM\nPhone: 03111234567\nService: Not Sure – Dental Consultation\nID: OSD-2'));
    assert.ok(r.params[2].indexOf('Ali Raza') < r.params[2].indexOf('Sara Khan'));
    assert.ok(r.params.every(singleLine));
  });
  await test('daily report: empty schedule gives a short "no appointments" message', () => {
    const r = buildDailyReport('2026-11-20', []);
    assert.equal(r.total, 0);
    assert.ok(r.text.includes('No confirmed appointments are scheduled for today'));
    assert.equal(r.params[1], '0');
    assert.ok(r.params[2].includes('No confirmed appointments'));
  });
  await test('daily report: very long lists stay within the template size budget', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ patientName: 'Muhammad Abdul Rehman Siddiqui', startTime: '17:00', phone: '03001234567', service: 'extraction-and-minor-oral-surgery', code: `OSD-261120-AB${i}XYZ` }));
    const r = buildDailyReport('2026-11-20', many);
    assert.ok(r.params[2].length < 800);
    assert.match(r.params[2], /\+\d+ more/);
    assert.equal(r.total, 40);
  });
  await test('late-booking notice includes patient, time, phone, service, ID and new total', () => {
    const m = buildLateBooking({ patientName: 'Bilal', startTime: '20:00', phone: '03221234567', service: 'general-dentistry', code: 'OSD-9', totalToday: 4 });
    for (const s of ['Bilal', '08:00 PM', '03221234567', 'General Dentistry', 'OSD-9', 'today: 4']) assert.ok(m.text.includes(s), s);
    assert.ok(m.params.every(singleLine));
  });
  done();
})();
