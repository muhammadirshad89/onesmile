import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChangePasswordForm } from '@/components/admin/ChangePasswordForm';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Change Password', robots: { index: false, follow: false } };

export default async function ChangePasswordPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{session.mustChangePassword ? 'Choose a new password' : 'Change password'}</h1>
        {session.mustChangePassword ? (
          <p className="notice">For your security, please replace the initial password before continuing.</p>
        ) : (
          <p className="muted"><Link href="/admin">← Back to dashboard</Link></p>
        )}
        <ChangePasswordForm forced={session.mustChangePassword} />
      </div>
    </div>
  );
}
