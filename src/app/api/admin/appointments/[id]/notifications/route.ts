import { prisma } from '@/lib/db';
import { json, requireAdmin } from '@/lib/api';
import { resendPatientConfirmation } from '@/lib/notify';

export const dynamic = 'force-dynamic';
type Ctx = { params: Promise<{ id: string }> };

/** WhatsApp delivery status for one appointment (admin only). Never returns tokens or provider payloads. */
export async function GET(_req: Request, ctx: Ctx) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const rows = await prisma.notificationLog.findMany({
    where: { appointmentId: id },
    orderBy: { createdAt: 'desc' },
    select: { kind: true, status: true, error: true, attempts: true, sentAt: true, createdAt: true },
  });
  return json({ notifications: rows });
}

/** Manual "Resend" for a confirmation that FAILED. Cannot resend one that was already delivered. */
export async function POST(_req: Request, ctx: Ctx) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  const outcome = await resendPatientConfirmation(id);
  if (outcome === 'duplicate') return json({ error: 'A confirmation was already sent or is being sent.' }, 409);
  if (outcome === 'skipped') return json({ error: 'Only confirmed appointments can receive a confirmation.' }, 409);
  return json({ outcome }, outcome === 'sent' ? 200 : 502);
}
