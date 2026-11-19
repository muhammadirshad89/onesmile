'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (next !== confirm) return setError('The new passwords do not match.');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not change password.');
        setBusy(false);
        return;
      }
      router.replace('/admin');
      router.refresh();
    } catch {
      setError('Network problem. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="auth-form">
      <div className="field">
        <label htmlFor="cp">{forced ? 'Initial password' : 'Current password'}</label>
        <input id="cp" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="np">New password</label>
        <input id="np" type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} aria-describedby="pw-rules" />
        <p id="pw-rules" className="muted small">At least 10 characters, with upper and lower case letters, a number and a symbol.</p>
      </div>
      <div className="field">
        <label htmlFor="cf">Confirm new password</label>
        <input id="cf" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
    </form>
  );
}
