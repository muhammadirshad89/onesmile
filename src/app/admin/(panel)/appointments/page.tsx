'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppointmentList } from '@/components/admin/AppointmentList';
import { api, type Appt } from '@/components/admin/common';
import { nowInKarachi } from '@/lib/schedule';

const STATUSES = ['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED'] as const;

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appt[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial filters from the URL (links from the overview cards)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const st = sp.get('status');
    if (st && (STATUSES as readonly string[]).includes(st)) setStatus(st);
    if (sp.get('scope') === 'today') setDate(nowInKarachi().date);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (status) p.set('status', status);
    if (date) p.set('date', date);
    try {
      const r = await api<{ appointments: Appt[] }>(`/api/admin/appointments?${p}`);
      setItems(r.appointments);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q, status, date]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce typing
    return () => clearTimeout(t);
  }, [load]);

  function onChange(updated: Appt | null, id: string) {
    setItems((list) => (updated ? list.map((a) => (a.id === id ? updated : a)) : list.filter((a) => a.id !== id)));
  }

  return (
    <div className="admin-page">
      <header className="admin-head"><h1>Appointments</h1></header>

      <div className="filters">
        <div className="field grow">
          <label htmlFor="q">Search patient name, phone or ID</label>
          <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Ayesha, 0332…, OSD-…" />
        </div>
        <div className="field">
          <label htmlFor="st">Status</label>
          <select id="st" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s ? s[0] + s.slice(1).toLowerCase() : 'All statuses'}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="dt">Date</label>
          <input id="dt" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="filter-btns">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDate(nowInKarachi().date)}>Today</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setStatus(''); setDate(''); }}>Clear</button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <p className="muted small">{loading ? 'Loading…' : `${items.length} appointment${items.length === 1 ? '' : 's'}`}</p>
      <section className="panel flush">
        <AppointmentList items={items} onChange={onChange} />
      </section>
    </div>
  );
}
