import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CtaBand, MapEmbed, SectionHead, ServiceCard, Timings } from '@/components/Parts';
import { Icon, WhatsAppIcon } from '@/components/Icon';
import { getClinicInfo } from '@/lib/clinic';
import { SERVICES } from '@/lib/services';
import { telLink, waLink, WA_DEFAULT_MESSAGE } from '@/lib/contact';
import { TESTIMONIALS } from '@/content/testimonials';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const WHY = [
  { icon: 'surgery', title: 'Surgical training', text: 'Doctor Ayesha holds an FCPS in Oral & Maxillofacial Surgery, supporting careful care for extractions, wisdom teeth and implant work.' },
  { icon: 'child', title: 'Gentle with children', text: 'A calm, friendly approach to paediatric dentistry that helps little patients feel safe and confident.' },
  { icon: 'shield', title: 'Hygiene and safety first', text: 'Gloves, masks and protective barriers are part of every visit, with instruments kept clean and covered.' },
  { icon: 'clock', title: 'Evening appointments', text: 'Open Monday to Saturday, 5:00 PM – 9:00 PM, so care fits around school and work.' },
];

export default async function HomePage() {
  const { clinic, hours } = await getClinicInfo();
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Dental Studio · DHA Phase 7, Karachi</span>
            <h1>Your Smile Deserves <span className="accent">Expert Care.</span></h1>
            <p className="lead">
              Experience personalized dental care with professional expertise, modern techniques, and a commitment to
              healthier, more confident smiles.
            </p>
            <div className="btn-row">
              <Link href="/book" className="btn btn-primary btn-lg">Book Appointment <Icon name="arrow" size={18} /></Link>
              <a href={telLink(clinic.doctorPhone)} className="btn btn-outline btn-lg"><Icon name="phone" size={18} /> Call Doctor</a>
            </div>
            <ul className="hero-points">
              <li><Icon name="check" size={18} /> Mon – Sat, 5 PM – 9 PM</li>
              <li><Icon name="check" size={18} /> Simple online booking</li>
              <li><Icon name="check" size={18} /> Adults &amp; children</li>
            </ul>
          </div>

          <div className="hero-visual">
            <div className="hero-frame">
              <Image
                src="/images/doctor-portrait.jpg"
                alt="Doctor Ayesha, Principal Dentist, carefully treating a patient"
                fill
                priority
                sizes="(max-width: 900px) 90vw, 480px"
                style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
              />
            </div>
            <div className="hero-badge">
              <span className="badge-icon"><Icon name="shield" size={22} /></span>
              <div>
                <strong>Doctor Ayesha</strong>
                <small>BDS, RDS, FCPS (Oral &amp; Maxillofacial Surgery)</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="section">
        <div className="container split">
          <div className="split-media">
            <Image
              src="/images/doctor-with-patient.jpg"
              alt="Doctor Ayesha examining a young patient with a dental light"
              width={900}
              height={1600}
              sizes="(max-width: 900px) 90vw, 460px"
              className="rounded-img tall"
            />
          </div>
          <div>
            <SectionHead eyebrow="Welcome to One Smile" title="A dental studio built around your comfort">
              One Smile Dental Studio offers thoughtful, personalised dental care in the heart of DHA Phase 7. From
              routine check-ups to oral surgery and implants, every treatment begins with listening, a clear
              explanation and a plan that suits you.
            </SectionHead>
            <ul className="tick-list big">
              <li><Icon name="check" size={18} /> Clear explanations in simple, patient-friendly language</li>
              <li><Icon name="check" size={18} /> Careful, planned treatment with your comfort in mind</li>
              <li><Icon name="check" size={18} /> Care for the whole family, from children to adults</li>
            </ul>
            <Link href="/about" className="btn btn-outline">About the studio</Link>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section section-soft">
        <div className="container">
          <SectionHead center eyebrow="Our services" title="Complete dental care under one roof">
            Five focused treatment areas, delivered with professional expertise and a gentle touch.
          </SectionHead>
          <div className="grid-services">
            {SERVICES.map((s) => <ServiceCard key={s.slug} s={s} />)}
          </div>
          <p className="center mt-lg"><Link href="/services" className="btn btn-outline">View all services</Link></p>
        </div>
      </section>

      {/* WHY */}
      <section className="section">
        <div className="container">
          <SectionHead center eyebrow="Why choose One Smile" title="Care you can feel confident about" />
          <div className="grid-4">
            {WHY.map((w) => (
              <div className="card feature" key={w.title}>
                <div className="icon-badge"><Icon name={w.icon} size={26} /></div>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOCTOR */}
      <section className="section section-navy">
        <div className="container split split-reverse">
          <div className="split-media">
            <Image
              src="/images/doctor-portrait.jpg"
              alt="Portrait of Doctor Ayesha in a face mask, concentrating during a dental procedure"
              width={1280}
              height={1600}
              sizes="(max-width: 900px) 90vw, 460px"
              className="rounded-img"
            />
          </div>
          <div>
            <span className="eyebrow eyebrow-light">Meet your dentist</span>
            <h2>Doctor Ayesha</h2>
            <p className="designation">Principal Dentist, One Smile Dental Studio</p>
            <p className="quals">BDS, RDS, FCPS (Oral &amp; Maxillofacial Surgery)</p>
            <p>
              Doctor Ayesha leads One Smile Dental Studio with a focus on careful, personalised treatment. Her
              training in oral and maxillofacial surgery informs everyday dentistry, from preventive check-ups and
              children’s care to extractions, wisdom tooth removal and implant treatment.
            </p>
            <div className="btn-row">
              <Link href="/about" className="btn btn-light">Read her profile</Link>
              <Link href="/book" className="btn btn-outline-light">Book with Doctor Ayesha</Link>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS – only genuine ones supplied by the clinic */}
      {TESTIMONIALS.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead center eyebrow="Patient stories" title="What our patients say" />
            <div className="grid-3">
              {TESTIMONIALS.map((t) => (
                <figure className="card testimonial" key={t.name + t.text.slice(0, 12)}>
                  <blockquote>“{t.text}”</blockquote>
                  <figcaption><strong>{t.name}</strong>{t.service ? <span> · {t.service}</span> : null}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TIMINGS + CONTACT */}
      <section className="section section-soft">
        <div className="container grid-2">
          <div className="card pad-lg">
            <h2 className="h3"><Icon name="clock" size={24} /> Clinic timings</h2>
            <Timings hours={hours} />
            <Link href="/book" className="btn btn-primary btn-block">Book Appointment</Link>
          </div>
          <div className="card pad-lg">
            <h2 className="h3"><Icon name="phone" size={24} /> Get in touch</h2>
            <ul className="contact-cards">
              <li>
                <span>Doctor</span>
                <a href={telLink(clinic.doctorPhone)}>{clinic.doctorPhone}</a>
                <a className="wa-link" href={waLink(clinic.doctorPhone, WA_DEFAULT_MESSAGE)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={16} /> WhatsApp</a>
              </li>
              <li>
                <span>Assistant</span>
                <a href={telLink(clinic.assistantPhone)}>{clinic.assistantPhone}</a>
                <a className="wa-link" href={waLink(clinic.assistantPhone, WA_DEFAULT_MESSAGE)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={16} /> WhatsApp</a>
              </li>
              <li><span>Email</span><a href={`mailto:${clinic.email}`}>{clinic.email}</a></li>
              <li><span>Address</span><address>{clinic.address}</address></li>
            </ul>
          </div>
        </div>
      </section>

      {/* MAP */}
      <section className="section">
        <div className="container">
          <SectionHead center eyebrow="Find us" title="Visit us in DHA Phase 7" />
          <MapEmbed />
        </div>
      </section>

      <CtaBand clinic={clinic} />
    </>
  );
}
