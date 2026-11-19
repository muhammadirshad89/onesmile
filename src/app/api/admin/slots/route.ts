import { prisma } from '@/lib/db';
import { json, readJson, requireAdmin } from '@/lib/api';
import { getDaySlots } from '@/lib/availability';
import { isValidDateStr, isValidTimeStr } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

/** GET ?date=YYYY-MM-DD[&forReschedule=<appointmentId>] – slots with their state, for admin tools. */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const sp = new URL(req.url).searchParams;
  const date = sp.get('date') ?? '';
  if (!isValidDateStr(date)) return json({ error: 'Invalid date' }, 400);
  const day = await getDaySlots(date, {
    adminMode: true,
    excludeAppointmentId: sp.get('forReschedule') ?? undefined,
  });
  return json(day);
}

/** POST { date, time, blocked } – switch one slot off/on. */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const b = (await readJson(req)) as { date?: string; time?: string; blocked?: boolean } | null;
  if (!b?.date || !b.time || !isValidDateStr(b.date) || !isValidTimeStr(b.time)) return json({ error: 'Invalid slot' }, 400);

  if (b.blocked) {
    await prisma.blockedSlot.upsert({
      where: { date_startTime: { date: b.date, startTime: b.time } },
      update: {},
      create: { date: b.date, startTime: b.time },
    });
  } else {
    await prisma.blockedSlot.deleteMany({ where: { date: b.date, startTime: b.time } });
  }
  return json({ ok: true });
}
