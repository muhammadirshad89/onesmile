import type { Metadata } from 'next';
import { Icon, WhatsAppIcon } from '@/components/Icon';
import { MapEmbed, SectionHead, Timings } from '@/components/Parts';
import { getClinicInfo } from '@/lib/clinic';
import { telLink, waLink, WA_DEFAULT_MESSAGE } from '@/lib/contact';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us – One Smile Dental Studio, DHA Phase 7',
  description:
    'Call, WhatsApp or visit One Smile Dental Studio at 4 C, Sehar Commercial Area, DHA Phase 7, Karachi. Open Monday to Saturday, 5 PM – 9 PM.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const { clinic, hours } = await getClinicInfo();
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Contact us</span>
          <h1>We’d love to hear from you</h1>
          <p className="lead">Call, message or visit the studio. Or book online and we’ll contact you to confirm.</p>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2">
          <div className="stack">
            <div className="card pad-lg contact-block">
              <div className="icon-badge"><Icon name="phone" size={24} /></div>
              <div>
                <h3>Doctor</h3>
                <a className="big-link" href={telLink(clinic.doctorPhone)}>{clinic.doctorPhone}</a>
                <div className="btn-row tight">
                  <a className="btn btn-primary btn-sm" href={telLink(clinic.doctorPhone)}><Icon name="phone" size={16} /> Call</a>
                  <a className="btn btn-wa btn-sm" href={waLink(clinic.doctorPhone, WA_DEFAULT_MESSAGE)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={16} /> WhatsApp</a>
                </div>
              </div>
            </div>
            <div className="card pad-lg contact-block">
              <div className="icon-badge"><Icon name="phone" size={24} /></div>
              <div>
                <h3>Assistant</h3>
                <a className="big-link" href={telLink(clinic.assistantPhone)}>{clinic.assistantPhone}</a>
                <div className="btn-row tight">
                  <a className="btn btn-primary btn-sm" href={telLink(clinic.assistantPhone)}><Icon name="phone" size={16} /> Call</a>
                  <a className="btn btn-wa btn-sm" href={waLink(clinic.assistantPhone, WA_DEFAULT_MESSAGE)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={16} /> WhatsApp</a>
                </div>
              </div>
            </div>
            <div className="card pad-lg contact-block">
              <div className="icon-badge"><Icon name="mail" size={24} /></div>
              <div>
                <h3>Email</h3>
                <a className="big-link small-link" href={`mailto:${clinic.email}`}>{clinic.email}</a>
              </div>
            </div>
            <div className="card pad-lg contact-block">
              <div className="icon-badge"><Icon name="pin" size={24} /></div>
              <div>
                <h3>Address</h3>
                <address>{clinic.address}</address>
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="card pad-lg">
              <h2 className="h3"><Icon name="clock" size={24} /> Clinic timings</h2>
              <Timings hours={hours} />
              <Link href="/book" className="btn btn-primary btn-block">Book Appointment</Link>
            </div>
            <div className="card pad-lg">
              <h2 className="h3">Follow us</h2>
              <div className="social-row dark">
                <a href={clinic.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="One Smile on Facebook"><Icon name="facebook" /> <span>Facebook</span></a>
                <a href={clinic.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="One Smile on Instagram"><Icon name="instagram" /> <span>Instagram</span></a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionHead center eyebrow="Location" title="Find the studio" />
          <MapEmbed />
        </div>
      </section>
    </>
  );
}
