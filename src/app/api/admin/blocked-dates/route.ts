import { prisma } from '@/lib/db';
import { json, readJson, requireAdmin } from '@/lib/api';
import { isValidDateStr, nowInKarachi } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const blocked = await prisma.blockedDate.findMany({
    where: { date: { gte: nowInKarachi().date } },
    orderBy: { date: 'asc' },
  });
  return json({ blocked });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const b = (await readJson(req)) as { date?: string; reason?: string; kind?: string } | null;
  if (!b?.date || !isValidDateStr(b.date)) return json({ error: 'Choose a valid date.' }, 400);
  const kind = b.kind === 'HOLIDAY' ? 'HOLIDAY' : 'BLOCKED';
  const reason = b.reason?.trim().slice(0, 120) || null;
  const row = await prisma.blockedDate.upsert({
    where: { date: b.date },
    update: { reason, kind },
    create: { date: b.date, reason, kind },
  });
  const affected = await prisma.appointment.count({
    where: { date: b.date, status: { in: ['PENDING', 'CONFIRMED'] } },
  });
  return json({ blocked: row, affectedAppointments: affected });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const date = new URL(req.url).searchParams.get('date') ?? '';
  if (!isValidDateStr(date)) return json({ error: 'Invalid date' }, 400);
  await prisma.blockedDate.deleteMany({ where: { date } });
  return json({ ok: true });
}
