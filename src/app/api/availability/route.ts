import { getDaySlots } from '@/lib/availability';
import { json, failure } from '@/lib/api';
import { isValidDateStr } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

/** Public: slots for one date. Never exposes patient data – only available / not available. */
export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get('date') ?? '';
  if (!isValidDateStr(date)) return json({ error: 'Invalid date', code: 'INVALID_DATE' }, 400);
  let day;
  try {
    day = await getDaySlots(date);
  } catch (e) {
    return failure(e, 'api/availability');
  }
  return json({
    date: day.date,
    weekdayName: day.weekdayName,
    status: day.status,
    note: day.note,
    slots: day.slots.map((s) => ({ start: s.start, end: s.end, label: s.label, available: s.available })),
  });
}
