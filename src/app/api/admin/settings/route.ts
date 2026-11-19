import { prisma } from '@/lib/db';
import { json, readJson, requireAdmin } from '@/lib/api';
import { getSettings } from '@/lib/availability';
import { settingsSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  return json({ settings: await getSettings() });
}

export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const parsed = settingsSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid settings' }, 400);
  const settings = await prisma.clinicSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });
  return json({ settings });
}
