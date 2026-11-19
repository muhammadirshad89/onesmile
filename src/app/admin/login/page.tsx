import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
import { getAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin Login', robots: { index: false, follow: false } };

export default async function LoginPage() {
  let session = null;
  try {
    session = await getAdminSession();
  } catch {
    /* missing SESSION_SECRET etc. – show the form anyway; login will report the problem */
  }
  if (session) redirect(session.mustChangePassword ? '/admin/change-password' : '/admin');
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Image src="/images/logo.jpg" alt="One Smile Dental Studio" width={88} height={88} priority />
        <h1>Admin sign in</h1>
        <p className="muted">One Smile Dental Studio</p>
        <LoginForm />
      </div>
    </div>
  );
}
