import type { AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { json, requireAdmin } from '@/lib/api';
import { isValidDateStr } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

const STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

/** GET /api/admin/appointments?status=&date=&from=&to=&q=&phone=&limit= */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const sp = new URL(req.url).searchParams;
  const where: Prisma.AppointmentWhereInput = {};

  const status = sp.get('status');
  if (status && STATUSES.includes(status as AppointmentStatus)) where.status = status as AppointmentStatus;

  const date = sp.get('date');
  const from = sp.get('from');
  const to = sp.get('to');
  if (date && isValidDateStr(date)) where.date = date;
  else if ((from && isValidDateStr(from)) || (to && isValidDateStr(to))) {
    where.date = {
      ...(from && isValidDateStr(from) ? { gte: from } : {}),
      ...(to && isValidDateStr(to) ? { lte: to } : {}),
    };
  }

  const phone = sp.get('phone');
  if (phone) where.phone = phone;

  const q = sp.get('q')?.trim();
  if (q) {
    const digits = q.replace(/\D/g, '');
    where.OR = [
      { patientName: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ];
  }

  const limit = Math.min(Number(sp.get('limit')) || 300, 1000);
  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
    take: limit,
    select: {
      id: true, code: true, patientName: true, phone: true, email: true, service: true, date: true,
      startTime: true, endTime: true, message: true, status: true, adminNote: true,
      rescheduledFrom: true, createdAt: true, updatedAt: true,
    },
  });
  return json({ appointments });
}
