import { prisma } from '@/lib/db';
import { hashPassword, setSessionCookie, verifyPassword } from '@/lib/auth';
import { json, readJson, requireAdmin } from '@/lib/api';
import { passwordSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const guard = await requireAdmin({ allowMustChange: true });
  if (guard.error) return guard.error;

  const body = (await readJson(req)) as { currentPassword?: unknown; newPassword?: unknown } | null;
  const current = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body?.newPassword === 'string' ? body.newPassword : '';

  const user = await prisma.adminUser.findUnique({ where: { id: guard.session.id } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return json({ error: 'Your current password is incorrect.' }, 400);
  }
  const check = passwordSchema.safeParse(next);
  if (!check.success) return json({ error: check.error.issues[0].message }, 400);
  if (await verifyPassword(next, user.passwordHash)) {
    return json({ error: 'The new password must be different from the current one.' }, 400);
  }

  const updated = await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(next),
      mustChangePassword: false,
      sessionVersion: { increment: 1 }, // signs out every other device
    },
  });
  await setSessionCookie(updated);
  return json({ ok: true });
}
