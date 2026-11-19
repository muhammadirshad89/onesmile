import { prisma } from '@/lib/db';
import { json, requireAdmin } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Patients are derived from appointments, grouped by phone number. */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const q = new URL(req.url).searchParams.get('q')?.trim();

  const rows = await prisma.appointment.findMany({
    where: q
      ? {
          OR: [
            { patientName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q.replace(/\D/g, '') || '__none__' } },
          ],
        }
      : undefined,
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    select: { id: true, code: true, patientName: true, phone: true, email: true, service: true, date: true, startTime: true, status: true },
    take: 2000,
  });

  const map = new Map<string, { phone: string; name: string; email?: string | null; visits: typeof rows }>();
  for (const r of rows) {
    const p = map.get(r.phone) ?? { phone: r.phone, name: r.patientName, email: r.email, visits: [] as typeof rows };
    p.visits.push(r);
    if (!p.email && r.email) p.email = r.email;
    map.set(r.phone, p);
  }
  return json({ patients: [...map.values()] });
}
