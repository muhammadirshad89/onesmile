/* Run with:  npm test   (uses tsx, no database needed) */
import assert from 'node:assert/strict';
import {
  addDays, computeDayAvailability, DEFAULT_HOURS, formatTime12, generateSlots, nowInKarachi, weekdayOf,
  type ComputeInput,
} from '../src/lib/schedule';
import { normalizePhone, waLink } from '../src/lib/contact';

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log('  ✓', name);
};

// 2026-11-19 is a Thursday. Pretend "now" is that day at 10:00 Karachi time.
const NOW = { date: '2026-11-19', minutes: 10 * 60 };
const base = (over: Partial<ComputeInput> = {}): ComputeInput => ({
  date: '2026-11-20',
  now: NOW,
  hours: DEFAULT_HOURS,
  durationMin: 30,
  leadMin: 60,
  maxAdvanceDays: 60,
  bookingEnabled: true,
  blockedDate: null,
  blockedSlots: new Set(),
  appointments: [],
  ...over,
});

console.log('schedule');
test('weekday detection', () => {
  assert.equal(weekdayOf('2026-11-19'), 4); // Thursday
  assert.equal(weekdayOf('2026-11-22'), 0); // Sunday
});
test('date arithmetic crosses month/year', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});
test('Karachi clock is UTC+5 (no DST)', () => {
  const r = nowInKarachi(new Date('2026-11-19T19:30:00Z')); // 00:30 next day in Karachi
  assert.equal(r.date, '2026-11-20');
  assert.equal(r.minutes, 30);
});
test('30-minute slots 5PM–9PM = 8 slots, last starts 8:30 PM', () => {
  const s = generateSlots('17:00', '21:00', 30);
  assert.equal(s.length, 8);
  assert.equal(s[0].start, '17:00');
  assert.equal(s[7].start, '20:30');
  assert.equal(s[7].end, '21:00');
});
test('no slot may run past closing time', () => {
  const s = generateSlots('17:00', '21:00', 45);
  assert.equal(s.at(-1)!.end <= '21:00', true);
});
test('time formatting', () => {
  assert.equal(formatTime12('17:00'), '5:00 PM');
  assert.equal(formatTime12('20:30'), '8:30 PM');
});
test('Sunday is closed – no slots', () => {
  const d = computeDayAvailability(base({ date: '2026-11-22' }));
  assert.equal(d.status, 'closed');
  assert.equal(d.slots.length, 0);
});
test('Monday–Saturday are open 5–9 PM', () => {
  for (const date of ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-21']) {
    const d = computeDayAvailability(base({ date }));
    assert.equal(d.status, 'open', date);
    assert.equal(d.slots.length, 8);
    assert.equal(d.slots[0].start, '17:00');
  }
});
test('past dates are rejected', () => {
  const d = computeDayAvailability(base({ date: '2026-11-18' }));
  assert.equal(d.status, 'past');
  assert.equal(d.slots.length, 0);
});
test('today: slots earlier than now + lead time are unavailable', () => {
  const d = computeDayAvailability(base({ date: '2026-11-19', now: { date: '2026-11-19', minutes: 17 * 60 + 10 } }));
  // now 17:10 + 60 => earliest 18:10 → 18:30 is the first free slot
  const firstFree = d.slots.find((s) => s.available)!;
  assert.equal(firstFree.start, '18:30');
  assert.equal(d.slots.find((s) => s.start === '17:00')!.reason, 'past');
});
test('booked slot cannot be booked again', () => {
  const d = computeDayAvailability(base({ appointments: [{ startTime: '18:00', endTime: '18:30' }] }));
  const s = d.slots.find((x) => x.start === '18:00')!;
  assert.equal(s.available, false);
  assert.equal(s.reason, 'booked');
  assert.equal(d.slots.find((x) => x.start === '18:30')!.available, true);
});
test('changing duration: a 60-min slot is blocked by an overlapping older 30-min booking', () => {
  const d = computeDayAvailability(base({ durationMin: 60, appointments: [{ startTime: '17:30', endTime: '18:00' }] }));
  assert.equal(d.slots.find((x) => x.start === '17:00')!.available, false);
  assert.equal(d.slots.find((x) => x.start === '18:00')!.available, true);
});
test('blocked date (holiday) has no slots', () => {
  const d = computeDayAvailability(base({ blockedDate: { reason: 'Eid', kind: 'HOLIDAY' } }));
  assert.equal(d.status, 'holiday');
  assert.equal(d.slots.length, 0);
});
test('individually blocked slots are unavailable', () => {
  const d = computeDayAvailability(base({ blockedSlots: new Set(['19:00']) }));
  assert.equal(d.slots.find((x) => x.start === '19:00')!.reason, 'blocked');
});
test('booking disabled switch hides all slots for the public', () => {
  const d = computeDayAvailability(base({ bookingEnabled: false }));
  assert.equal(d.status, 'disabled');
  assert.equal(d.slots.length, 0);
});
test('admin mode ignores the booking switch and lead time', () => {
  const d = computeDayAvailability(base({ bookingEnabled: false, adminMode: true }));
  assert.equal(d.status, 'open');
});
test('too far in the future', () => {
  const d = computeDayAvailability(base({ date: '2027-06-01' }));
  assert.equal(d.status, 'too_far');
});
test('invalid date', () => {
  assert.equal(computeDayAvailability(base({ date: '2026-02-31' })).status, 'invalid');
});

console.log('contact');
test('phone normalisation', () => {
  assert.equal(normalizePhone('0332-3259577'), '03323259577');
  assert.equal(normalizePhone('+92 332 3259577'), '03323259577');
  assert.equal(normalizePhone('923316256127'), '03316256127');
  assert.equal(normalizePhone('3316256127'), '03316256127');
  assert.equal(normalizePhone('abc'), null);
  assert.equal(normalizePhone('12345'), null);
});
test('WhatsApp links match the numbers supplied by the clinic', () => {
  assert.ok(waLink('0332-3259577').startsWith('https://wa.me/923323259577'));
  assert.ok(waLink('0331-6256127').startsWith('https://wa.me/923316256127'));
});

console.log(`\n${passed} tests passed`);
