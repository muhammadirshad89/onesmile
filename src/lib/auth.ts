import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './db';

export const SESSION_COOKIE = 'osds_admin_session';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function secretKey() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set to a random string of 32+ characters.');
  return new TextEncoder().encode(s);
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export async function setSessionCookie(user: { id: string; sessionVersion: number }) {
  const token = await new SignJWT({ sv: user.sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export interface AdminSession {
  id: string;
  username: string;
  mustChangePassword: boolean;
}

/** Verifies the cookie AND re-checks the user in the database (so password changes revoke old sessions). */
export async function getAdminSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    const user = await prisma.adminUser.findUnique({ where: { id: String(payload.sub) } });
    if (!user || user.sessionVersion !== payload.sv) return null;
    return { id: user.id, username: user.username, mustChangePassword: user.mustChangePassword };
  } catch {
    return null;
  }
}

/**
 * Creates the first admin from environment variables – only when no admin exists yet.
 * The password is hashed immediately and the admin must change it at first login.
 */
export async function ensureInitialAdmin() {
  const count = await prisma.adminUser.count();
  if (count > 0) return;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!username || !password) {
    console.warn('[auth] No admin exists and ADMIN_USERNAME / ADMIN_INITIAL_PASSWORD are not set – nobody can sign in.');
    return;
  }
  try {
    await prisma.adminUser.create({
      data: { username, passwordHash: await hashPassword(password), mustChangePassword: true },
    });
  } catch (e) {
    // P2002 = another request created it first – fine. Anything else is a real problem: surface it.
    if ((e as { code?: string })?.code !== 'P2002') throw e;
  }
}
