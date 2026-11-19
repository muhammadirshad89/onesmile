'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppointmentList } from '@/components/admin/AppointmentList';
import { api, fmtDate, type Appt } from '@/components/admin/common';

interface Stats {
  today: string;
  total: number;
  todayCount: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  upcomingPending: Appt[];
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [today, setToday] = useState<Appt[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const s = await api<Stats>('/api/admin/stats');
      const t = await api<{ appointments: Appt[] }>(`/api/admin/appointments?date=${s.today}`);
      setStats(s);
      setToday(t.appointments.filter((a) => a.status !== 'REJECTED' && a.status !== 'CANCELLED').sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // new bookings appear automatically
    return () => clearInterval(t);
  }, [load]);

  const cards = stats
    ? [
        { label: 'Total appointments', value: stats.total, href: '/admin/appointments' },
        { label: 'Today', value: stats.todayCount, href: '/admin/appointments?scope=today' },
        { label: 'Pending', value: stats.pending, href: '/admin/appointments?status=PENDING', tone: 'amber' },
        { label: 'Confirmed', value: stats.confirmed, href: '/admin/appointments?status=CONFIRMED', tone: 'teal' },
        { label: 'Completed', value: stats.completed, href: '/admin/appointments?status=COMPLETED', tone: 'navy' },
        { label: 'Cancelled / rejected', value: stats.cancelled, href: '/admin/appointments?status=CANCELLED', tone: 'red' },
      ]
    : [];

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <h1>Overview</h1>
          {stats && <p className="muted">{fmtDate(stats.today)}</p>}
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
      </header>

      {error && <p className="form-error">{error}</p>}

      <div className="stat-grid">
        {!stats && !error && Array.from({ length: 6 }).map((_, i) => <div key={i} className="stat skeleton" />)}
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className={`stat ${c.tone ?? ''}`}>
            <span className="stat-value">{c.value}</span>
            <span className="stat-label">{c.label}</span>
          </Link>
        ))}
      </div>

      <div className="admin-two">
        <section className="panel">
          <h2>Needs your review</h2>
          {stats && (
            <AppointmentList
              items={stats.upcomingPending}
              empty="No pending requests. You’re all caught up."
              onChange={() => load()}
            />
          )}
        </section>
        <section className="panel">
          <h2>Today’s appointments</h2>
          <AppointmentList items={today} showDate={false} empty="No appointments today." onChange={() => load()} />
        </section>
      </div>
    </div>
  );
}
