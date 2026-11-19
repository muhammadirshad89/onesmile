import { prisma } from '@/lib/db';
import { json, requireAdmin } from '@/lib/api';
import { nowInKarachi } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const today = nowInKarachi().date;
  const [total, todayCount, pending, confirmed, completed, cancelled, upcomingPending] = await Promise.all([
    prisma.appointment.count(),
    prisma.appointment.count({ where: { date: today, status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } } }),
    prisma.appointment.count({ where: { status: 'PENDING' } }),
    prisma.appointment.count({ where: { status: 'CONFIRMED' } }),
    prisma.appointment.count({ where: { status: 'COMPLETED' } }),
    prisma.appointment.count({ where: { status: { in: ['CANCELLED', 'REJECTED'] } } }),
    prisma.appointment.findMany({
      where: { status: 'PENDING', date: { gte: today } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 8,
    }),
  ]);

  return json({ today, total, todayCount, pending, confirmed, completed, cancelled, upcomingPending });
}
