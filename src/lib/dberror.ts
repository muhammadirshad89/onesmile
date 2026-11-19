/**
 * Turns low-level database / configuration failures into a stable, patient-safe shape.
 * Duck-typed on purpose (no Prisma import) so it is trivially unit-testable.
 *
 * Every failure is ALSO logged by the caller with console.error, so the real cause is
 * visible in Vercel → Logs while patients only see a friendly message.
 */
export type ApiFailureCode = 'DB_NOT_READY' | 'DB_UNAVAILABLE' | 'CONFIG_ERROR' | 'SERVER_ERROR';

export interface ApiFailure {
  status: number;
  code: ApiFailureCode;
  /** Message safe to show to the public. */
  publicMessage: string;
  /** Short technical reason for server logs only. */
  logReason: string;
}

export function classifyError(e: unknown): ApiFailure {
  const err = e as { code?: string; name?: string; message?: string } | null;
  const code = err?.code ?? '';
  const name = err?.name ?? '';
  const msg = String(err?.message ?? '');

  // P2021 table missing, P2022 column missing => migrations were never (fully) applied.
  if (code === 'P2021' || code === 'P2022' || /relation ".*" does not exist/i.test(msg)) {
    return {
      status: 503,
      code: 'DB_NOT_READY',
      publicMessage: 'The booking system is being set up. Please call or WhatsApp the clinic to book.',
      logReason: `Database tables are missing (${code || 'relation does not exist'}). Run: npx prisma migrate deploy`,
    };
  }
  // PrismaClientInitializationError / P1xxx / env var problems => cannot reach or configure the DB.
  if (
    name === 'PrismaClientInitializationError' ||
    /^P1\d{3}$/.test(code) ||
    /Environment variable not found: DATABASE_URL|Can't reach database server|Authentication failed|timed out/i.test(msg)
  ) {
    return {
      status: 503,
      code: 'DB_UNAVAILABLE',
      publicMessage: 'We could not reach the booking system just now. Please try again in a moment, or call or WhatsApp the clinic.',
      logReason: `Cannot connect to the database (${code || name}). Check DATABASE_URL.`,
    };
  }
  if (/SESSION_SECRET/.test(msg)) {
    return {
      status: 503,
      code: 'CONFIG_ERROR',
      publicMessage: 'The service is not configured correctly yet. Please contact the website administrator.',
      logReason: 'SESSION_SECRET is missing or shorter than 32 characters.',
    };
  }
  return {
    status: 500,
    code: 'SERVER_ERROR',
    publicMessage: 'Something went wrong on our side. Please try again or call the clinic.',
    logReason: msg.slice(0, 300) || name || 'unknown error',
  };
}
