import { NextResponse } from 'next/server';
import { getAdminSession, type AdminSession } from './auth';
import { classifyError } from './dberror';

/** Every API response carries `ok: true|false` so the frontend can rely on one format. */
export const json = (data: unknown, status = 200) => {
  const body =
    data && typeof data === 'object' && !Array.isArray(data) && !('ok' in data)
      ? { ok: status < 400, ...(data as Record<string, unknown>) }
      : data;
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
};

/** Logs the real cause (visible in Vercel → Logs) and returns a friendly, consistent error response. */
export function failure(e: unknown, where: string) {
  const f = classifyError(e);
  console.error(`[${where}] ${f.code}: ${f.logReason}`, e);
  return json({ error: f.publicMessage, code: f.code }, f.status);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

type Guard = { session: AdminSession; error?: undefined } | { session?: undefined; error: NextResponse };

/** Use at the top of every /api/admin handler. */
export async function requireAdmin(opts: { allowMustChange?: boolean } = {}): Promise<Guard> {
  const session = await getAdminSession();
  if (!session) return { error: json({ error: 'Not authenticated' }, 401) };
  if (session.mustChangePassword && !opts.allowMustChange) {
    return { error: json({ error: 'Password change required', code: 'MUST_CHANGE_PASSWORD' }, 403) };
  }
  return { session };
}
