/** Contact helpers that work on both server and client. */

/** Normalise a phone number the patient typed. Returns null when it is not plausible. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const international = trimmed.startsWith('+') || trimmed.startsWith('00');
  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(2); // 0092… -> 92…
  if (digits.startsWith('92') && digits.length >= 11 && digits.length <= 12) {
    return /^0\d{9,10}$/.test('0' + digits.slice(2)) ? '0' + digits.slice(2) : null;
  }
  if (digits.length === 10 && digits.startsWith('3')) digits = '0' + digits; // 3323259577
  if (/^0\d{9,10}$/.test(digits)) return digits; // Pakistani mobile / landline
  if (international && digits.length >= 8 && digits.length <= 15) return '+' + digits.replace(/^00/, '');
  return null;
}

/** Digits-only international number for wa.me, e.g. 0332-3259577 -> 923323259577 */
export function waNumber(phone: string): string {
  const n = normalizePhone(phone);
  if (!n) return phone.replace(/\D/g, '');
  if (n.startsWith('+')) return n.slice(1);
  return '92' + n.slice(1);
}

export function waLink(phone: string, text?: string): string {
  const base = `https://wa.me/${waNumber(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export const WA_DEFAULT_MESSAGE = 'Hello One Smile Dental Studio, I would like to inquire about a dental appointment.';
