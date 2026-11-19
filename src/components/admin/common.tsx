'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { formatDateLong, formatTime12 } from '@/lib/schedule';

export interface Appt {
  id: string;
  code: string;
  patientName: string;
  phone: string;
  email: string | null;
  service: string;
  date: string;
  startTime: string;
  endTime: string;
  message: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  adminNote: string | null;
  rescheduledFrom: string | null;
  createdAt: string;
  updatedAt: string;
}

/** fetch wrapper for the admin API. Redirects on expired session / forced password change. */
export async function api<T = any>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = '/admin/login';
    throw new Error('Session expired');
  }
  if (res.status === 403 && data.code === 'MUST_CHANGE_PASSWORD') {
    window.location.href = '/admin/change-password';
    throw new Error('Password change required');
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const STATUS_LABEL: Record<Appt['status'], string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function StatusPill({ status }: { status: Appt['status'] }) {
  return <span className={`pill pill-${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>;
}

export const fmtDate = (d: string) => formatDateLong(d);
export const fmtTime = (t: string) => formatTime12(t);
export const fmtShortDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(Date.UTC(y, m - 1, day)));
};

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
