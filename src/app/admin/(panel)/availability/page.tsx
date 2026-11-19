'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate, fmtShortDate } from '@/components/admin/common';
import { WEEKDAY_NAMES, nowInKarachi } from '@/lib/schedule';

interface Hour { weekday: number; isOpen: boolean; openTime: string; closeTime: string }
interface Settings {
  slotMinutes: number; bookingEnabled: boolean; bookingDisabledMessage: string; leadMinutes: number; maxAdvanceDays: number;
  [k: string]: unknown;
}
interface Blocked { id: string; date: string; reason: string | null; kind: string }
interface SlotState { start: string; label: string; available: boolean; reason?: 'booked' | 'blocked' | 'past' }

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function AvailabilityPage() {
  const [hours, setHours] = useState<Hour[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // block-a-date form
  const [bDate, setBDate] = useState('');
  const [bReason, setBReason] = useState('');
  const [bKind, setBKind] = useState<'HOLIDAY' | 'BLOCKED'>('HOLIDAY');

  // per-slot manager
  const [sDate, setSDate] = useState('');
  const [slotDay, setSlotDay] = useState<{ status: string; note?: string; slots: SlotState[] } | null>(null);

  const loadAll = useCallback(async () => {
    const [h, s, b] = await Promise.all([
      api<{ hours: Hour[] }>('/api/admin/hours'),
      api<{ settings: Settings }>('/api/admin/settings'),
      api<{ blocked: Blocked[] }>('/api/admin/blocked-dates'),
    ]);
    setHours(h.hours);
    setSettings(s.settings);
    setBlocked(b.blocked);
  }, []);

  useEffect(() => {
    loadAll().catch((e) => setMsg({ ok: false, text: e.message }));
    setSDate(nowInKarachi().date);
  }, [loadAll]);

  const loadSlotDay = useCallback(async (d: string) => {
    if (!d) return;
    try {
      setSlotDay(await api(`/api/admin/slots?date=${d}`));
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }, []);
  useEffect(() => {
    loadSlotDay(sDate);
  }, [sDate, loadSlotDay]);

  async function save(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: `${label} saved.` });
      await loadAll();
      await loadSlotDay(sDate);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const upHour = (wd: number, patch: Partial<Hour>) => setHours((hs) => hs.map((h) => (h.weekday === wd ? { ...h, ...patch } : h)));
  const upSet = (patch: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...patch } : s));

  if (!settings) return <div className="admin-page"><p className="muted">Loading…</p></div>;

  return (
    <div className="admin-page">
      <header className="admin-head"><h1>Availability</h1></header>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role="status">{msg.text}</p>}

      <div className="admin-two">
        <section className="panel">
          <h2>Online booking</h2>
          <label className="switch">
            <input type="checkbox" checked={settings.bookingEnabled} onChange={(e) => upSet({ bookingEnabled: e.target.checked })} />
            <span>Accept online booking requests</span>
          </label>
          {!settings.bookingEnabled && (
            <div className="field">
              <label htmlFor="dis-msg">Message shown to patients</label>
              <textarea id="dis-msg" rows={2} maxLength={300} value={settings.bookingDisabledMessage} onChange={(e) => upSet({ bookingDisabledMessage: e.target.value })} />
            </div>
          )}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="dur">Appointment duration</label>
              <select id="dur" value={settings.slotMinutes} onChange={(e) => upSet({ slotMinutes: Number(e.target.value) })}>
                {[15, 20, 30, 40, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="lead">Minimum notice (same day)</label>
              <select id="lead" value={settings.leadMinutes} onChange={(e) => upSet({ leadMinutes: Number(e.target.value) })}>
                {[0, 30, 60, 120, 180].map((m) => <option key={m} value={m}>{m === 0 ? 'None' : `${m} minutes`}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="adv">Book up to</label>
              <select id="adv" value={settings.maxAdvanceDays} onChange={(e) => upSet({ maxAdvanceDays: Number(e.target.value) })}>
                {[14, 30, 60, 90, 180].map((m) => <option key={m} value={m}>{m} days ahead</option>)}
              </select>
            </div>
          </div>
          <p className="muted small">Changing the duration only affects new bookings. Existing appointments keep their time and still block overlapping slots.</p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              save('Booking settings', () =>
                api('/api/admin/settings', { method: 'PUT', body: pickSettings(settings) }),
              )
            }
          >
            Save booking settings
          </button>
        </section>

        <section className="panel">
          <h2>Operating hours</h2>
          <div className="hours-grid">
            {ORDER.map((wd) => {
              const h = hours.find((x) => x.weekday === wd)!;
              return (
                <div className="hours-row" key={wd}>
                  <label className="switch">
                    <input type="checkbox" checked={h.isOpen} onChange={(e) => upHour(wd, { isOpen: e.target.checked })} />
                    <span>{WEEKDAY_NAMES[wd]}</span>
                  </label>
                  {h.isOpen ? (
                    <span className="hours-times">
                      <input type="time" aria-label={`${WEEKDAY_NAMES[wd]} opens`} value={h.openTime} onChange={(e) => upHour(wd, { openTime: e.target.value })} />
                      <span>to</span>
                      <input type="time" aria-label={`${WEEKDAY_NAMES[wd]} closes`} value={h.closeTime} onChange={(e) => upHour(wd, { closeTime: e.target.value })} />
                    </span>
                  ) : <span className="muted">Closed</span>}
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save('Operating hours', () => api('/api/admin/hours', { method: 'PUT', body: { hours } }))}>
            Save operating hours
          </button>
        </section>
      </div>

      <div className="admin-two">
        <section className="panel">
          <h2>Holidays &amp; blocked dates</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="b-date">Date</label>
              <input id="b-date" type="date" min={nowInKarachi().date} value={bDate} onChange={(e) => setBDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="b-kind">Type</label>
              <select id="b-kind" value={bKind} onChange={(e) => setBKind(e.target.value as 'HOLIDAY' | 'BLOCKED')}>
                <option value="HOLIDAY">Holiday</option>
                <option value="BLOCKED">Blocked (leave / other)</option>
              </select>
            </div>
            <div className="field field-wide">
              <label htmlFor="b-reason">Reason (optional)</label>
              <input id="b-reason" type="text" maxLength={120} value={bReason} onChange={(e) => setBReason(e.target.value)} placeholder="e.g. Eid holiday" />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !bDate}
            onClick={() =>
              save('Blocked date', async () => {
                const r = await api<{ affectedAppointments: number }>('/api/admin/blocked-dates', { method: 'POST', body: { date: bDate, reason: bReason, kind: bKind } });
                if (r.affectedAppointments > 0) {
                  window.alert(`${r.affectedAppointments} existing appointment(s) fall on ${fmtDate(bDate)}. They were not changed – please reschedule or contact those patients.`);
                }
                setBDate('');
                setBReason('');
              })
            }
          >
            Block this date
          </button>
          <ul className="blocked-list">
            {blocked.length === 0 && <li className="muted">No upcoming blocked dates.</li>}
            {blocked.map((b) => (
              <li key={b.id}>
                <span><strong>{fmtShortDate(b.date)}</strong> <span className={`pill ${b.kind === 'HOLIDAY' ? 'pill-confirmed' : 'pill-pending'}`}>{b.kind === 'HOLIDAY' ? 'Holiday' : 'Blocked'}</span> {b.reason}</span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => save('Date reopened', () => api(`/api/admin/blocked-dates?date=${b.date}`, { method: 'DELETE' }))}>Reopen</button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Manage slots for a date</h2>
          <div className="field">
            <label htmlFor="s-date">Date</label>
            <input id="s-date" type="date" min={nowInKarachi().date} value={sDate} onChange={(e) => setSDate(e.target.value)} />
          </div>
          {slotDay && slotDay.status !== 'open' && <p className="slots-empty slots-closed">{slotDay.note}</p>}
          {slotDay?.status === 'open' && (
            <>
              <p className="muted small">Tap a free slot to switch it off (or back on). Booked slots are managed from Appointments.</p>
              <div className="slot-grid">
                {slotDay.slots.map((s) => {
                  const toggleable = s.reason === 'blocked' || s.available;
                  return (
                    <button
                      key={s.start}
                      type="button"
                      className={`slot ${s.reason === 'blocked' ? 'is-blocked' : ''} ${s.reason === 'booked' ? 'is-booked' : ''}`}
                      disabled={!toggleable || busy}
                      title={s.reason === 'booked' ? 'Booked' : s.reason === 'past' ? 'Time has passed' : s.reason === 'blocked' ? 'Switched off – tap to enable' : 'Available – tap to switch off'}
                      onClick={() =>
                        save('Slot', () =>
                          api('/api/admin/slots', { method: 'POST', body: { date: sDate, time: s.start, blocked: s.reason !== 'blocked' } }),
                        )
                      }
                    >
                      {s.label}
                      <small>{s.reason === 'blocked' ? 'Off' : s.reason === 'booked' ? 'Booked' : s.reason === 'past' ? 'Past' : 'Open'}</small>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function pickSettings(s: Settings) {
  // send only the editable fields the API validates
  const keys = ['clinicName', 'doctorName', 'doctorPhone', 'assistantPhone', 'email', 'address', 'facebookUrl', 'instagramUrl', 'slotMinutes', 'bookingEnabled', 'bookingDisabledMessage', 'leadMinutes', 'maxAdvanceDays'];
  return Object.fromEntries(keys.map((k) => [k, s[k]]));
}
