import { prisma } from './db';
import {
  computeDayAvailability,
  DEFAULT_HOURS,
  nowInKarachi,
  type DayAvailability,
  type HourRule,
} from './schedule';

/** Statuses that occupy a slot. */
export const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED'] as const;

export async function getSettings() {
  return prisma.clinicSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

/** Always returns 7 rows, creating any that are missing. */
export async function getHours(): Promise<HourRule[]> {
  let rows = await prisma.workingHour.findMany({ orderBy: { weekday: 'asc' } });
  if (rows.length < 7) {
    await prisma.workingHour.createMany({ data: DEFAULT_HOURS, skipDuplicates: true });
    rows = await prisma.workingHour.findMany({ orderBy: { weekday: 'asc' } });
  }
  return rows;
}

export async function getDaySlots(
  date: string,
  opts: { excludeAppointmentId?: string; adminMode?: boolean } = {},
): Promise<DayAvailability> {
  const [settings, hours, blockedDate, blockedSlots, appointments] = await Promise.all([
    getSettings(),
    getHours(),
    prisma.blockedDate.findUnique({ where: { date } }),
    prisma.blockedSlot.findMany({ where: { date } }),
    prisma.appointment.findMany({
      where: {
        date,
        status: { in: [...ACTIVE_STATUSES] },
        ...(opts.excludeAppointmentId ? { NOT: { id: opts.excludeAppointmentId } } : {}),
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  return computeDayAvailability({
    date,
    now: nowInKarachi(),
    hours,
    durationMin: settings.slotMinutes,
    leadMin: settings.leadMinutes,
    maxAdvanceDays: settings.maxAdvanceDays,
    bookingEnabled: settings.bookingEnabled,
    blockedDate,
    blockedSlots: new Set(blockedSlots.map((b) => b.startTime)),
    appointments,
    adminMode: opts.adminMode,
  });
}
