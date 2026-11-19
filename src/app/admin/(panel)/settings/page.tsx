'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/components/admin/common';

const FIELDS: { key: string; label: string; type?: string; wide?: boolean }[] = [
  { key: 'clinicName', label: 'Clinic name' },
  { key: 'doctorName', label: 'Doctor name' },
  { key: 'doctorPhone', label: 'Doctor phone', type: 'tel' },
  { key: 'assistantPhone', label: 'Assistant phone', type: 'tel' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'address', label: 'Address', wide: true },
  { key: 'facebookUrl', label: 'Facebook link', type: 'url', wide: true },
  { key: 'instagramUrl', label: 'Instagram link', type: 'url', wide: true },
];

export default function SettingsPage() {
  const [s, setS] = useState<Record<string, any> | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ settings: Record<string, any> }>('/api/admin/settings').then((r) => setS(r.settings)).catch((e) => setMsg({ ok: false, text: e.message }));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    setMsg(null);
    try {
      const { id, updatedAt, ...body } = s;
      void id; void updatedAt;
      await api('/api/admin/settings', { method: 'PUT', body });
      setMsg({ ok: true, text: 'Settings saved. Changes appear on the public website within a few minutes.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (!s) return <div className="admin-page"><p className="muted">{msg?.text ?? 'Loading…'}</p></div>;

  return (
    <div className="admin-page">
      <header className="admin-head"><h1>Settings</h1></header>
      {msg && <p className={msg.ok ? 'form-ok' : 'form-error'} role="status">{msg.text}</p>}

      <form className="panel" onSubmit={save}>
        <h2>Clinic &amp; contact information</h2>
        <div className="form-grid">
          {FIELDS.map((f) => (
            <div key={f.key} className={`field ${f.wide ? 'field-wide' : ''}`}>
              <label htmlFor={`s-${f.key}`}>{f.label}</label>
              <input id={`s-${f.key}`} type={f.type ?? 'text'} value={s[f.key] ?? ''} onChange={(e) => setS({ ...s, [f.key]: e.target.value })} required />
            </div>
          ))}
        </div>
        <p className="muted small">Booking duration, notice period, holidays and hours are managed on the <Link href="/admin/availability">Availability</Link> page.</p>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>

      <section className="panel">
        <h2>Account security</h2>
        <p>Change your admin password regularly. Changing it signs you out on all other devices.</p>
        <Link href="/admin/change-password" className="btn btn-outline">Change password</Link>
      </section>
    </div>
  );
}
