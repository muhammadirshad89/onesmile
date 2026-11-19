'use client';

import { useState } from 'react';
import { serviceTitle } from '@/lib/services';
import { AppointmentModal } from './AppointmentModal';
import { fmtShortDate, fmtTime, StatusPill, type Appt } from './common';

/** Responsive list of appointments; clicking opens the full-details modal with every action. */
export function AppointmentList({
  items,
  onChange,
  showDate = true,
  empty = 'No appointments found.',
}: {
  items: Appt[];
  onChange: (updated: Appt | null, id: string) => void;
  showDate?: boolean;
  empty?: string;
}) {
  const [open, setOpen] = useState<Appt | null>(null);
  if (items.length === 0) return <p className="empty-state">{empty}</p>;
  return (
    <>
      <ul className="appt-list">
        {items.map((a) => (
          <li key={a.id}>
            <button type="button" className="appt-row" onClick={() => setOpen(a)}>
              <span className="appt-when">
                {showDate && <strong>{fmtShortDate(a.date)}</strong>}
                <span>{fmtTime(a.startTime)}</span>
              </span>
              <span className="appt-who">
                <strong>{a.patientName}</strong>
                <small>{a.phone}</small>
              </span>
              <span className="appt-service">{serviceTitle(a.service)}</span>
              <span className="appt-status"><StatusPill status={a.status} /></span>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <AppointmentModal
          key={open.id + open.updatedAt}
          appt={open}
          onClose={() => setOpen(null)}
          onChanged={(u) => onChange(u, open.id)}
        />
      )}
    </>
  );
}
