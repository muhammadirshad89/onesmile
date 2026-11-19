'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/appointments', label: 'Appointments' },
  { href: '/admin/calendar', label: 'Calendar' },
  { href: '/admin/availability', label: 'Availability' },
  { href: '/admin/patients', label: 'Patients' },
  { href: '/admin/settings', label: 'Settings' },
];

export function AdminShell({ username, children }: { username: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="admin-brand">
          <Image src="/images/logo.jpg" alt="One Smile Dental Studio" width={40} height={40} />
          <div><strong>One Smile</strong><small>Admin</small></div>
        </div>
        <nav aria-label="Admin navigation">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={(n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)) ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="admin-user">
          <small>Signed in as <strong>{username}</strong></small>
          <Link href="/admin/change-password">Change password</Link>
          <button type="button" className="btn btn-outline-light btn-sm" onClick={logout} disabled={busy}>Log out</button>
          <Link href="/" target="_blank" className="muted-link">View website ↗</Link>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
