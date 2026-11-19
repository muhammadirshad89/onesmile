import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { ensureInitialAdmin, setSessionCookie, verifyPassword } from '@/lib/auth';
import { json, readJson, failure } from '@/lib/api';
import { getClientIp } from '@/lib/security';

export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS_PER_IP = 8;
const MAX_FAILS_PER_USER = 10;

// Used to keep response time similar when the username does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

async function handle(req: Request) {
  const body = (await readJson(req)) as { username?: unknown; password?: unknown } | null;
  const username = typeof body?.username === 'string' ? body.username.trim().slice(0, 64) : '';
  const password = typeof body?.password === 'string' ? body.password.slice(0, 200) : '';
  if (!username || !password) return json({ error: 'Enter your username and password.' }, 400);

  const ip = getClientIp(req);
  const since = new Date(Date.now() - WINDOW_MS);
  const [ipFails, userFails] = await Promise.all([
    prisma.loginAttempt.count({ where: { ip, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { username, createdAt: { gte: since } } }),
  ]);
  if (ipFails >= MAX_FAILS_PER_IP || userFails >= MAX_FAILS_PER_USER) {
    return json({ error: 'Too many failed attempts. Please wait 15 minutes and try again.' }, 429);
  }

  await ensureInitialAdmin();
  const user = await prisma.adminUser.findUnique({ where: { username } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !ok) {
    await prisma.loginAttempt.create({ data: { ip, username } });
    return json({ error: 'Incorrect username or password.' }, 401);
  }

  await prisma.loginAttempt.deleteMany({ where: { username } });
  await setSessionCookie(user);
  return json({ ok: true, mustChangePassword: user.mustChangePassword });
}

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    return failure(e, 'api/admin/login');
  }
}
