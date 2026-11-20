import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ClinicInfo } from '@/lib/clinic';
import { summariseHours } from '@/lib/clinic';
import type { HourRule } from '@/lib/schedule';
import type { Service } from '@/lib/services';
import { Icon } from './Icon';

export function SectionHead({ eyebrow, title, children, center }: { eyebrow: string; title: string; children?: ReactNode; center?: boolean }) {
  return (
    <div className={`section-head ${center ? 'center' : ''}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function ServiceCard({ s, detailed }: { s: Service; detailed?: boolean }) {
  return (
    <article className="card service-card" id={detailed ? s.slug : undefined}>
      <div className="icon-badge"><Icon name={s.icon} size={28} /></div>
      <h3>{s.title}</h3>
      <p>{detailed ? s.description : s.short}</p>
      {detailed && (
        <ul className="tick-list">
          {s.points.map((p) => (
            <li key={p}><Icon name="check" size={16} /> {p}</li>
          ))}
        </ul>
      )}
      <Link href={`/book?service=${s.slug}`} className="card-link">
        Book appointment <Icon name="arrow" size={16} />
      </Link>
    </article>
  );
}

export function Timings({ hours }: { hours: HourRule[] }) {
  const rows = summariseHours(hours);
  return (
    <table className="timings">
      <caption className="sr-only">Clinic opening hours</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.days} className={r.closed ? 'is-closed' : ''}>
            <th scope="row">{r.days}</th>
            <td>{r.time}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MapEmbed() {
  return (
    <div className="map-wrap">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3621.095456288527!2d67.02948288885499!3d24.82640900000001!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3eb33dfbbe9145eb%3A0x7dc5cab4616be5b9!2sSmile%20with%20Dr.%20Asha%20(FCPS%20Orthodontist)%20-%20Dentist%20in%20Clifton%20%26%20DHA!5e0!3m2!1sen!2s!4v1795067581071!5m2!1sen!2s"
        width="600"
        height="450"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        title="One Smile Dental Studio on Google Maps"
      />
    </div>
  );
}

export function CtaBand({ clinic }: { clinic: ClinicInfo }) {
  return (
    <section className="cta-band">
      <div className="container cta-inner">
        <div>
          <h2>Ready for a healthier, more confident smile?</h2>
          <p>Book online in under a minute and receive instant confirmation.</p>
        </div>
        <div className="cta-actions">
          <Link href="/book" className="btn btn-light">Book Appointment</Link>
          <a href={`tel:${clinic.doctorPhone.replace(/[^\d+]/g, '')}`} className="btn btn-outline-light">
            <Icon name="phone" size={18} /> Call Doctor
          </a>
        </div>
      </div>
    </section>
  );
}
