'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppointmentList } from '@/components/admin/AppointmentList';
import { AppointmentModal } from '@/components/admin/AppointmentModal';
import { api, fmtDate, fmtShortDate, fmtTime, type Appt } from '@/components/admin/common';
import { addDays, nowInKarachi, weekdayOf } from '@/lib/schedule';

type View = 'month' | 'week' | 'day';
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const mondayOf = (d: string) => addDays(d, -((weekdayOf(d) + 6) % 7));

function rangeFor(view: View, cursor: string) {
  if (view === 'day') return { from: cursor, to: cursor };
  if (view === 'week') {
    const from = mondayOf(cursor);
    return { from, to: addDays(from, 6) };
  }
  const first = `${cursor.slice(0, 7)}-01`;
  const from = mondayOf(first);
  return { from, to: addDays(from, 41) };
}

function shift(view: View, cursor: string, dir: 1 | -1) {
  if (view === 'day') return addDays(cursor, dir);
  if (view === 'week') return addDays(cursor, 7 * dir);
  const [y, m] = cursor.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + dir, 1));
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [view, setView] = useState<View>('month');
  const [today, setToday] = useState('');
  const [cursor, setCursor] = useState('');
  const [items, setItems] = useState<Appt[]>([]);
  const [open, setOpen] = useState<Appt | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = nowInKarachi().date;
    setToday(t);
    setCursor(t);
  }, []);

  const range = useMemo(() => (cursor ? rangeFor(view, cursor) : null), [view, cursor]);

  const load = useCallback(async () => {
    if (!range) return;
    try {
      const r = await api<{ appointments: Appt[] }>(`/api/admin/appointments?from=${range.from}&to=${range.to}&limit=1000`);
      setItems(r.appointments.filter((a) => a.status !== 'REJECTED' && a.status !== 'CANCELLED'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const m = new Map<string, Appt[]>();
    for (const a of items) m.set(a.date, [...(m.get(a.date) ?? []), a]);
    for (const list of m.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return m;
  }, [items]);

  if (!cursor || !range) return <div className="admin-page"><p className="muted">Loading…</p></div>;

  const title =
    view === 'day'
      ? fmtDate(cursor)
      : view === 'week'
        ? `${fmtShortDate(range.from)} – ${fmtShortDate(range.to)}`
        : new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(cursor + 'T00:00:00Z'));

  const days = view === 'month' ? Array.from({ length: 42 }, (_, i) => addDays(range.from, i)) : Array.from({ length: 7 }, (_, i) => addDays(range.from, i));
  const chip = (a: Appt) => (
    <button key={a.id} type="button" className={`cal-chip s-${a.status.toLowerCase()}`} onClick={() => setOpen(a)} title={`${a.patientName} – ${a.status}`}>
      <b>{fmtTime(a.startTime)}</b> {a.patientName}
    </button>
  );

  return (
    <div className="admin-page">
      <header className="admin-head">
        <h1>Calendar</h1>
        <div className="seg" role="tablist" aria-label="Calendar view">
          {(['month', 'week', 'day'] as View[]).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <div className="cal-toolbar">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setCursor(shift(view, cursor, -1))} aria-label="Previous">‹</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setCursor(today)}>Today</button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setCursor(shift(view, cursor, 1))} aria-label="Next">›</button>
        <h2 className="cal-title">{title}</h2>
      </div>

      {error && <p className="form-error">{error}</p>}

      {view === 'month' && (
        <div className="cal-month">
          {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
          {days.map((d) => {
            const list = byDate.get(d) ?? [];
            const inMonth = d.slice(0, 7) === cursor.slice(0, 7);
            return (
              <div key={d} className={`cal-cell ${inMonth ? '' : 'dim'} ${d === today ? 'today' : ''} ${weekdayOf(d) === 0 ? 'sunday' : ''}`}>
                <button type="button" className="cal-daynum" onClick={() => { setCursor(d); setView('day'); }} aria-label={`Open ${fmtDate(d)}`}>
                  {Number(d.slice(8))}
                  {list.length > 0 && <span className="cal-count">{list.length}</span>}
                </button>
                <div className="cal-chips">
                  {list.slice(0, 3).map(chip)}
                  {list.length > 3 && <button type="button" className="cal-more" onClick={() => { setCursor(d); setView('day'); }}>+{list.length - 3} more</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'week' && (
        <div className="cal-week">
          {days.map((d) => (
            <div key={d} className={`cal-col ${d === today ? 'today' : ''} ${weekdayOf(d) === 0 ? 'sunday' : ''}`}>
              <button type="button" className="cal-colhead" onClick={() => { setCursor(d); setView('day'); }}>{fmtShortDate(d)}</button>
              <div className="cal-chips">
                {(byDate.get(d) ?? []).map(chip)}
                {!(byDate.get(d) ?? []).length && <span className="muted small">{weekdayOf(d) === 0 ? 'Closed' : '—'}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'day' && (
        <section className="panel flush">
          <AppointmentList
            items={byDate.get(cursor) ?? []}
            showDate={false}
            empty="No appointments on this day."
            onChange={() => load()}
          />
        </section>
      )}

      {open && view !== 'day' && (
        <AppointmentModal key={open.id + open.updatedAt} appt={open} onClose={() => setOpen(null)} onChanged={() => load()} />
      )}
    </div>
  );
}
