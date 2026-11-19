import crypto from 'node:crypto';

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** One-way hash so raw IPs are never stored. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'one-smile-default-salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 40);
}

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

/** e.g. OSD-261119-K7QX2 */
export function makeAppointmentCode(dateYmd: string): string {
  const ymd = dateYmd.replace(/-/g, '').slice(2);
  const bytes = crypto.randomBytes(5);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `OSD-${ymd}-${s}`;
}
