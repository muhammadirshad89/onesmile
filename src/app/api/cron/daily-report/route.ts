import crypto from 'node:crypto';
import { json } from '@/lib/api';
import { runDailyReport, retryFailedPatientConfirmations } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false; // refuse to run unprotected
  const given = req.headers.get('authorization') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Called by Vercel Cron (it sends `Authorization: Bearer <CRON_SECRET>` automatically) or by any external
 * scheduler. Safe to call repeatedly: the summary is sent at most once per Karachi day and never before 4 PM.
 */
export async function GET(req: Request) {
  if (!authorised(req)) return json({ error: 'Unauthorized' }, 401);
  const report = await runDailyReport();
  const retried = await retryFailedPatientConfirmations();
  return json({ report, retriedConfirmations: retried }, report.status === 'error' ? 500 : 200);
}
