import { prisma } from '@/lib/db';
import { json, readJson, requireAdmin } from '@/lib/api';
import { getHours } from '@/lib/availability';
import { hoursSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  return json({ hours: await getHours() });
}

export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const parsed = hoursSchema.safeParse((await readJson(req) as { hours?: unknown } | null)?.hours);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid working hours' }, 400);

  await prisma.$transaction(
    parsed.data.map((h) =>
      prisma.workingHour.upsert({
        where: { weekday: h.weekday },
        update: { isOpen: h.isOpen, openTime: h.openTime, closeTime: h.closeTime },
        create: h,
      }),
    ),
  );
  return json({ hours: await getHours() });
}
