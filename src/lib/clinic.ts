import { prisma } from './db';
import { DEFAULT_HOURS, type HourRule } from './schedule';

/** Exact details supplied by the clinic – used as the fallback when the database is unreachable. */
export const CLINIC_DEFAULTS = {
  clinicName: 'One Smile Dental Studio',
  doctorName: 'Doctor Ayesha',
  doctorPhone: '0332-3259577',
  assistantPhone: '0331-6256127',
  email: 'onesmilemystudio2021@gmail.com',
  address: '4 C, D.H.A. Phase 7, Sehar Commercial Area, Phase 7, Defence Housing Authority, Karachi, Pakistan. 75500.',
  facebookUrl: 'https://www.facebook.com/OSDRAYEESHAAA',
  instagramUrl: 'https://www.instagram.com/onesmile.docayesha/',
  slotMinutes: 30,
  bookingEnabled: true,
  bookingDisabledMessage:
    'Online booking is temporarily unavailable. Please call or WhatsApp us to arrange an appointment.',
  leadMinutes: 60,
  maxAdvanceDays: 60,
};

export type ClinicInfo = typeof CLINIC_DEFAULTS;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Public pages call this. Never throws – falls back to the supplied defaults. */
export async function getClinicInfo(): Promise<{ clinic: ClinicInfo; hours: HourRule[] }> {
  try {
    const [s, h] = await Promise.all([
      prisma.clinicSettings.findUnique({ where: { id: 1 } }),
      prisma.workingHour.findMany({ orderBy: { weekday: 'asc' } }),
    ]);
    const clinic: ClinicInfo = s
      ? {
          clinicName: s.clinicName,
          doctorName: s.doctorName,
          doctorPhone: s.doctorPhone,
          assistantPhone: s.assistantPhone,
          email: s.email,
          address: s.address,
          facebookUrl: s.facebookUrl,
          instagramUrl: s.instagramUrl,
          slotMinutes: s.slotMinutes,
          bookingEnabled: s.bookingEnabled,
          bookingDisabledMessage: s.bookingDisabledMessage,
          leadMinutes: s.leadMinutes,
          maxAdvanceDays: s.maxAdvanceDays,
        }
      : CLINIC_DEFAULTS;
    const hours = h.length === 7 ? h : DEFAULT_HOURS;
    return { clinic, hours };
  } catch {
    return { clinic: CLINIC_DEFAULTS, hours: DEFAULT_HOURS };
  }
}

/** Groups consecutive days that share the same hours, e.g. "Monday – Saturday". */
export function summariseHours(hours: HourRule[]): { days: string; time: string; closed: boolean }[] {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday first
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return `${String(h % 12 === 0 ? 12 : h % 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };
  const rows: { days: string[]; time: string; closed: boolean }[] = [];
  for (const wd of order) {
    const r = hours.find((x) => x.weekday === wd) ?? { weekday: wd, isOpen: false, openTime: '', closeTime: '' };
    const time = r.isOpen ? `${fmt(r.openTime)} – ${fmt(r.closeTime)}` : 'Closed';
    const last = rows[rows.length - 1];
    if (last && last.time === time) last.days.push(names[wd]);
    else rows.push({ days: [names[wd]], time, closed: !r.isOpen });
  }
  return rows.map((r) => ({
    days: r.days.length > 1 ? `${r.days[0]} – ${r.days[r.days.length - 1]}` : r.days[0],
    time: r.time,
    closed: r.closed,
  }));
}
