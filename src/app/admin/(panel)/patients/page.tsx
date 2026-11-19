'use client';

import { useEffect, useState } from 'react';
import { serviceTitle } from '@/lib/services';
import { waLink, telLink } from '@/lib/contact';
import { api, fmtShortDate, fmtTime, StatusPill, type Appt } from '@/components/admin/common';

interface Patient {
  phone: string;
  name: string;
  email?: string | null;
  visits: Pick<Appt, 'id' | 'code' | 'service' | 'date' | 'startTime' | 'status'>[];
}

export default function PatientsPage() {
  const [q, setQ] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await api<{ patients: Patient[] }>(`/api/admin/patients${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
        setPatients(r.patients);
        setError('');
      } catch (e) {
        setError((e as Error).message);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const current = patients.find((p) => p.phone === selected) ?? null;

  return (
    <div className="admin-page">
      <header className="admin-head"><h1>Patients</h1></header>
      <div className="field">
        <label htmlFor="pq">Search by name or phone</label>
        <input id="pq" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <p className="form-error">{error}</p>}

      <div className="admin-two patients">
        <section className="panel flush">
          <ul className="patient-list">
            {patients.length === 0 && <li className="empty-state">No patients yet.</li>}
            {patients.map((p) => (
              <li key={p.phone}>
                <button type="button" className={selected === p.phone ? 'on' : ''} onClick={() => setSelected(p.phone)}>
                  <strong>{p.name}</strong>
                  <small>{p.phone} · {p.visits.length} appointment{p.visits.length === 1 ? '' : 's'}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          {!current && <p className="muted">Select a patient to see their details and appointment history.</p>}
          {current && (
            <>
              <h2>{current.name}</h2>
              <p>
                <a href={telLink(current.phone)}>{current.phone}</a>
                {current.email && <> · <a href={`mailto:${current.email}`}>{current.email}</a></>}
              </p>
              <div className="btn-row tight">
                <a className="btn btn-wa btn-sm" href={waLink(current.phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                <a className="btn btn-outline btn-sm" href={telLink(current.phone)}>Call</a>
              </div>
              <h3 className="mt">Appointment history</h3>
              <ul className="history">
                {current.visits.map((v) => (
                  <li key={v.id}>
                    <span><strong>{fmtShortDate(v.date)}</strong>, {fmtTime(v.startTime)}</span>
                    <span>{serviceTitle(v.service)}</span>
                    <StatusPill status={v.status} />
                    <small className="mono">{v.code}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
