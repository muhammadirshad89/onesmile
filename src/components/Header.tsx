'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/contact', label: 'Contact' },
];

export function Header({ doctorPhone, clinicName }: { doctorPhone: string; clinicName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label={`${clinicName} – home`}>
          <Image src="/images/logo.jpg" alt="One Smile Dental Studio logo" width={52} height={52} priority className="brand-logo" />
          <span className="brand-text">
            <strong>One Smile</strong>
            <small>Dental Studio</small>
          </span>
        </Link>

        <nav className="nav-desktop" aria-label="Main navigation">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname === n.href ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <a className="btn btn-ghost btn-sm hide-md" href={`tel:${doctorPhone.replace(/[^\d+]/g, '')}`}>
            <Icon name="phone" size={16} /> {doctorPhone}
          </a>
          <Link href="/book" className="btn btn-primary btn-sm">
            Book Appointment
          </Link>
          <button
            type="button"
            className="menu-btn"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      <div id="mobile-menu" className={`mobile-menu ${open ? 'is-open' : ''}`} hidden={!open}>
        <nav aria-label="Mobile navigation">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={pathname === n.href ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
          <Link href="/book" className="btn btn-primary">
            Book Appointment
          </Link>
          <a className="btn btn-outline" href={`tel:${doctorPhone.replace(/[^\d+]/g, '')}`}>
            <Icon name="phone" size={18} /> Call Doctor
          </a>
        </nav>
      </div>
    </header>
  );
}
