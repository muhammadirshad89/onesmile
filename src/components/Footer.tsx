import Image from 'next/image';
import Link from 'next/link';
import type { ClinicInfo } from '@/lib/clinic';
import { summariseHours } from '@/lib/clinic';
import type { HourRule } from '@/lib/schedule';
import { SERVICES } from '@/lib/services';
import { telLink, waLink, WA_DEFAULT_MESSAGE } from '@/lib/contact';
import { Icon, WhatsAppIcon } from './Icon';

export function Footer({ clinic, hours }: { clinic: ClinicInfo; hours: HourRule[] }) {
  const rows = summariseHours(hours);
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">
            <Image src="/images/logo.jpg" alt="One Smile Dental Studio logo" width={84} height={84} />
          </div>
          <p>
            Personalised dental care by Doctor Ayesha, with professional expertise, modern techniques and a commitment
            to healthier, more confident smiles.
          </p>
          <div className="social-row">
            <a href={clinic.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="One Smile on Facebook">
              <Icon name="facebook" />
            </a>
            <a href={clinic.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="One Smile on Instagram">
              <Icon name="instagram" />
            </a>
            <a href={waLink(clinic.doctorPhone, WA_DEFAULT_MESSAGE)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Doctor">
              <WhatsAppIcon />
            </a>
          </div>
        </div>

        <div>
          <h3>Quick links</h3>
          <ul>
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/services">Services</Link></li>
            <li><Link href="/book">Book Appointment</Link></li>
            <li><Link href="/contact">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <h3>Services</h3>
          <ul>
            {SERVICES.map((s) => (
              <li key={s.slug}><Link href={`/services#${s.slug}`}>{s.title}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Contact</h3>
          <ul className="contact-list">
            <li><Icon name="phone" size={16} /> <span>Doctor: <a href={telLink(clinic.doctorPhone)}>{clinic.doctorPhone}</a></span></li>
            <li><Icon name="phone" size={16} /> <span>Assistant: <a href={telLink(clinic.assistantPhone)}>{clinic.assistantPhone}</a></span></li>
            <li><Icon name="mail" size={16} /> <a href={`mailto:${clinic.email}`}>{clinic.email}</a></li>
            <li><Icon name="pin" size={16} /> <span>{clinic.address}</span></li>
          </ul>
          <h3 className="mt">Clinic timings</h3>
          <ul className="timings-mini">
            {rows.map((r) => (
              <li key={r.days}><span>{r.days}</span><span>{r.time}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>© {new Date().getFullYear()} {clinic.clinicName}. All rights reserved.</p>
          <p className="dev-credit">
            <strong>Design &amp; Develop by: Syyed Muhammad Irshad</strong>
            <span>
              {' '}WhatsApp:{' '}
              <a href="https://wa.me/923218100537" target="_blank" rel="noopener noreferrer">+923218100537</a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
