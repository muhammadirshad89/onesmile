/** Pure scheduling decisions for the 4 PM doctor summary (unit-tested; no I/O). */

/** 4:00 PM Asia/Karachi, in minutes after midnight. */
export const REPORT_AT_MINUTES = 16 * 60;
export const STALE_SENDING_MS = 10 * 60 * 1000;
export const MAX_REPORT_ATTEMPTS = 5;

export type ClaimDecision = 'too-early' | 'create' | 'already-sent' | 'in-progress' | 'retry' | 'give-up';

export interface ExistingReport {
  status: string;
  attempts: number;
  updatedAt: Date;
}

/**
 * @param nowMinutes minutes since midnight in Asia/Karachi (from nowInKarachi())
 * @param existing   today's DailyReport row, if any
 */
export function decideReportClaim(nowMinutes: number, existing: ExistingReport | null, now: Date): ClaimDecision {
  if (nowMinutes < REPORT_AT_MINUTES) return 'too-early';
  if (!existing) return 'create';
  if (existing.status === 'SENT') return 'already-sent';
  if (existing.status === 'SENDING' && now.getTime() - existing.updatedAt.getTime() < STALE_SENDING_MS) return 'in-progress';
  // FAILED, or SENDING that never finished (function crashed / timed out)
  return existing.attempts >= MAX_REPORT_ATTEMPTS ? 'give-up' : 'retry';
}

/**
 * Should the doctor get an extra notice for a new booking?
 * Yes when the booking is for TODAY and today's summary has already been claimed (SENT, or SENDING – in which
 * case the booking may have missed the list) at or before the booking was created.
 * A duplicate mention is acceptable; a silently missing appointment is not.
 */
export function shouldNotifyDoctorLate(
  appt: { date: string; createdAt: Date },
  todayKarachi: string,
  report: { status: string; createdAt: Date } | null,
): boolean {
  if (appt.date !== todayKarachi || !report) return false;
  if (report.status !== 'SENT' && report.status !== 'SENDING') return false;
  return appt.createdAt.getTime() >= report.createdAt.getTime();
}
