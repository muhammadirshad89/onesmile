import { prisma } from '@/lib/db';
import { json } from '@/lib/api';
import { classifyError } from '@/lib/dberror';

export const dynamic = 'force-dynamic';

/**
 * Public deployment self-check: open /api/health after deploying.
 * Reports only yes/no flags – never secrets, connection strings, or whether an admin exists.
 */
export async function GET() {
  const config = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    sessionSecret: (process.env.SESSION_SECRET ?? '').length >= 32,
    adminEnv: Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_INITIAL_PASSWORD),
  };
  let database: 'ok' | 'unreachable' = 'ok';
  let schema: 'ok' | 'missing' | 'unknown' = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    database = 'unreachable';
    console.error('[api/health]', classifyError(e).logReason);
  }
  if (database === 'ok') {
    try {
      await Promise.all([prisma.appointment.count(), prisma.adminUser.count(), prisma.workingHour.count()]);
      schema = 'ok';
    } catch (e) {
      schema = 'missing';
      console.error('[api/health]', classifyError(e).logReason);
    }
  }
  const healthy = database === 'ok' && schema === 'ok' && config.sessionSecret;
  return json({ status: healthy ? 'ok' : 'degraded', database, schema, config }, healthy ? 200 : 503);
}
