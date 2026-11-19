/**
 * Pure scheduling logic (no database, no framework) so it can be unit-tested.
 * All dates are clinic-local calendar dates "YYYY-MM-DD" in Asia/Karachi
 * and all times are "HH:mm" (24h).
 */

export const CLINIC_TZ = 'Asia/Karachi';

export const DEFAULT_HOURS: HourRule[] = [
  { weekday: 0, isOpen: false, openTime: '17:00', closeTime: '21:00' }, // Sunday – closed
  { weekday: 1, isOpen: true, openTime: '17:00', closeTime: '21:00' },
  { weekday: 2, isOpen: true, openTime: '17:00', closeTime: '21:00' },
  { weekday: 3, isOpen: true, openTime: '17:00', closeTime: '21:00' },
  { weekday: 4, isOpen: true, openTime: '17:00', closeTime: '21:00' },
  { weekday: 5, isOpen: true, openTime: '17:00', closeTime: '21:00' },
  { weekday: 6, isOpen: true, openTime: '17:00', closeTime: '21:00' },
];

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface HourRule {
  weekday: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export type DayStatus =
  | 'open'
  | 'closed' // clinic is closed that weekday (e.g. Sunday)
  | 'holiday' // blocked/holiday date
  | 'past'
  | 'too_far'
  | 'disabled' // online booking switched off
  | 'invalid';

export interface SlotInfo {
  start: string;
  end: string;
  label: string;
  available: boolean;
  reason?: 'booked' | 'blocked' | 'past';
}

export interface DayAvailability {
  date: string;
  weekday: number;
  weekdayName: string;
  status: DayStatus;
  note?: string;
  slots: SlotInfo[];
}

/* ---------- date / time helpers ---------- */

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTimeStr(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [h, m] = s.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** Current date + minutes-since-midnight in Asia/Karachi. */
export function nowInKarachi(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** 0 = Sunday … 6 = Saturday for a calendar date (timezone independent). */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "17:30" -> "5:30 PM" */
export function formatTime12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatDateLong(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/* ---------- slot generation ---------- */

/** Every slot that fits fully inside [open, close). */
export function generateSlots(openTime: string, closeTime: string, durationMin: number): { start: string; end: string }[] {
  const out: { start: string; end: string }[] = [];
  if (!isValidTimeStr(openTime) || !isValidTimeStr(closeTime) || durationMin < 5) return out;
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);
  for (let s = open; s + durationMin <= close; s += durationMin) {
    out.push({ start: minutesToTime(s), end: minutesToTime(s + durationMin) });
  }
  return out;
}

export interface ComputeInput {
  date: string;
  now: { date: string; minutes: number };
  hours: HourRule[];
  durationMin: number;
  leadMin: number;
  maxAdvanceDays: number;
  bookingEnabled: boolean;
  blockedDate?: { reason?: string | null; kind?: string } | null;
  blockedSlots: Set<string>; // "HH:mm" start times switched off on this date
  appointments: { startTime: string; endTime: string }[]; // active ones only
  /** admin tools may ignore the lead time / booking switch / advance window */
  adminMode?: boolean;
}

const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;

export function computeDayAvailability(input: ComputeInput): DayAvailability {
  const { date, now, hours, durationMin, leadMin, maxAdvanceDays, bookingEnabled, adminMode } = input;
  const weekday = isValidDateStr(date) ? weekdayOf(date) : -1;
  const base = { date, weekday, weekdayName: WEEKDAY_NAMES[weekday] ?? '', slots: [] as SlotInfo[] };

  if (weekday < 0) return { ...base, status: 'invalid', note: 'Invalid date.' };
  if (date < now.date) return { ...base, status: 'past', note: 'This date has already passed.' };
  if (!adminMode && !bookingEnabled) return { ...base, status: 'disabled', note: 'Online booking is currently unavailable.' };
  if (!adminMode && date > addDays(now.date, maxAdvanceDays)) {
    return { ...base, status: 'too_far', note: `Bookings open up to ${maxAdvanceDays} days in advance.` };
  }
  if (input.blockedDate) {
    const why = input.blockedDate.reason ? ` (${input.blockedDate.reason})` : '';
    return { ...base, status: 'holiday', note: `The clinic is closed on this date${why}.` };
  }

  const rule = hours.find((h) => h.weekday === weekday);
  if (!rule || !rule.isOpen) {
    return { ...base, status: 'closed', note: `The clinic is closed on ${WEEKDAY_NAMES[weekday]}s.` };
  }

  const slots: SlotInfo[] = generateSlots(rule.openTime, rule.closeTime, durationMin).map(({ start, end }) => {
    const s = timeToMinutes(start);
    const e = timeToMinutes(end);
    let reason: SlotInfo['reason'];
    if (date === now.date && s < now.minutes + (adminMode ? 0 : leadMin)) reason = 'past';
    else if (input.blockedSlots.has(start)) reason = 'blocked';
    else if (input.appointments.some((a) => overlaps(s, e, timeToMinutes(a.startTime), timeToMinutes(a.endTime)))) {
      reason = 'booked';
    }
    return { start, end, label: formatTime12(start), available: !reason, reason };
  });

  return { ...base, status: 'open', slots };
}

export const slotKeyOf = (date: string, start: string) => `${date}T${start}`;
