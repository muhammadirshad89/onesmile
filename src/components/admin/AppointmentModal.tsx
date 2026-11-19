'use client';

import { useCallback, useEffect, useState } from 'react';
import { serviceTitle } from '@/lib/services';
import { waLink, telLink } from '@/lib/contact';
import { api, fmtDate, fmtTime, Modal, StatusPill, type Appt } from './common';

interface Slot { start: string; label: string; available: boolean; reason?: string }

function waMessage(a: Appt) {
  const when = `${fmtDate(a.date)} at ${fmtTime(a.startTime)}`;
  switch (a.status) {
    case 'CONFIRMED':
      return `Hello ${a.patientName}, this is One Smile Dental Studio. Your appointment (ID ${a.code}) is confirmed for ${when}. We look forward to seeing you.`;
    case 'REJECTED':
    case 'CANCELLED':
      return `Hello ${a.patientName}, this is One Smile Dental Studio regarding your appointment request (ID ${a.code}). Unfortunately we cannot offer ${when}. Please let us know another time that suits you.`;
    default:
      return `Hello ${a.patientName}, this is One Smile Dental Studio. We received your appointment request (ID ${a.code}) for ${when}. Could you please confirm that this time works for you?`;
  }
}

export function AppointmentModal({
  appt,
  onClose,
  onChanged,
}: {
  appt: Appt;
  onClose: () => void;
  onChanged: (a: Appt | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState(appt.adminNote ?? '');
  const [rescheduling, setRescheduling] = useState(false);
  const [rdate, setRdate] = useState(appt.date);
  const [rtime, setRtime] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotNote, setSlotNote] = useState('');

  const loadSlots = useCallback(
    async (date: string) => {
      setSlots(null);
      setSlotNote('');
      setRtime('');
      try {
        const d = await api<{ status: string; note?: string; slots: Slot[] }>(
          `/api/admin/slots?date=${date}&forReschedule=${appt.id}`,
        );
        if (d.status !== 'open') setSlotNote(d.note ?? 'No slots on this date.');
        setSlots(d.status === 'open' ? d.slots : []);
      } catch (e) {
        setSlotNote((e as Error).message);
        setSlots([]);
      }
    },
    [appt.id],
  );

  useEffect(() => {
    if (rescheduling) loadSlots(rdate);
  }, [rescheduling, rdate, loadSlots]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError('');
    try {
      const r = await api<{ appointment: Appt }>(`/api/admin/appointments/${appt.id}`, {
        method: 'PATCH',
        body: { action, adminNote: note, ...extra },
      });
      onChanged(r.appointment);
      if (action !== 'note') onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Permanently delete appointment ${appt.code} for ${appt.patientName}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/appointments/${appt.id}`, { method: 'DELETE' });
      onChanged(null);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const s = appt.status;
  const live = s === 'PENDING' || s === 'CONFIRMED';

  return (
    <Modal title={`Appointment ${appt.code}`} onClose={onClose}>
      <dl className="detail-grid">
        <div><dt>Status</dt><dd><StatusPill status={s} /></dd></div>
        <div><dt>Patient</dt><dd>{appt.patientName}</dd></div>
        <div><dt>Phone</dt><dd><a href={telLink(appt.phone)}>{appt.phone}</a></dd></div>
        <div><dt>Email</dt><dd>{appt.email ? <a href={`mailto:${appt.email}`}>{appt.email}</a> : '—'}</dd></div>
        <div><dt>Service</dt><dd>{serviceTitle(appt.service)}</dd></div>
        <div><dt>When</dt><dd>{fmtDate(appt.date)}<br />{fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}</dd></div>
        <div className="wide"><dt>Patient message</dt><dd>{appt.message || '—'}</dd></div>
        {appt.rescheduledFrom && <div className="wide"><dt>Rescheduled from</dt><dd>{appt.rescheduledFrom}</dd></div>}
        <div><dt>Requested on</dt><dd>{new Date(appt.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })}</dd></div>
      </dl>

      <div className="field">
        <label htmlFor="admin-note">Internal note</label>
        <textarea id="admin-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to admin only" />
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('note')}>Save note</button>
      </div>

      {rescheduling && (
        <div className="reschedule-box">
          <h3>Reschedule</h3>
          <div className="field">
            <label htmlFor="r-date">New date</label>
            <input id="r-date" type="date" value={rdate} onChange={(e) => setRdate(e.target.value)} />
          </div>
          {slots === null && <p className="muted">Loading slots…</p>}
          {slotNote && <p className="slots-empty slots-closed">{slotNote}</p>}
          {slots && slots.length > 0 && (
            <div className="slot-grid">
              {slots.map((sl) => (
                <button
                  key={sl.start}
                  type="button"
                  className={`slot ${rtime === sl.start ? 'is-selected' : ''}`}
                  disabled={!sl.available}
                  onClick={() => setRtime(sl.start)}
                  title={sl.available ? undefined : sl.reason}
                >
                  {sl.label}
                </button>
              ))}
            </div>
          )}
          <div className="btn-row tight">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !rtime} onClick={() => act('reschedule', { date: rdate, time: rtime })}>
              Move appointment
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRescheduling(false)}>Cancel</button>
          </div>
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="modal-actions">
        {s === 'PENDING' && <button className="btn btn-primary" disabled={busy} onClick={() => act('confirm')}>Confirm</button>}
        {s === 'CONFIRMED' && <button className="btn btn-primary" disabled={busy} onClick={() => act('complete')}>Mark completed</button>}
        {live && !rescheduling && <button className="btn btn-outline" disabled={busy} onClick={() => setRescheduling(true)}>Reschedule</button>}
        {s === 'PENDING' && <button className="btn btn-danger-outline" disabled={busy} onClick={() => act('reject')}>Reject</button>}
        {s === 'CONFIRMED' && <button className="btn btn-danger-outline" disabled={busy} onClick={() => act('cancel')}>Cancel appointment</button>}
        {(s === 'REJECTED' || s === 'CANCELLED') && <button className="btn btn-outline" disabled={busy} onClick={() => act('reopen')}>Reopen as pending</button>}
        <a className="btn btn-wa" href={waLink(appt.phone, waMessage(appt))} target="_blank" rel="noopener noreferrer">WhatsApp patient</a>
        <button className="btn btn-danger" disabled={busy} onClick={remove}>Delete</button>
      </div>
    </Modal>
  );
}
