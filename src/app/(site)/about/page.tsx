import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CtaBand, SectionHead } from '@/components/Parts';
import { Icon } from '@/components/Icon';
import { getClinicInfo } from '@/lib/clinic';

export const metadata: Metadata = {
  title: 'About Us – Doctor Ayesha & One Smile Dental Studio',
  description:
    'Meet Doctor Ayesha (BDS, RDS, FCPS Oral & Maxillofacial Surgery), Principal Dentist at One Smile Dental Studio, DHA Phase 7, Karachi, and learn about our approach to dental care.',
  alternates: { canonical: '/about' },
};

const PHILOSOPHY = [
  { icon: 'heart', title: 'Listen first', text: 'Every plan starts with understanding your concerns, your comfort level and your goals.' },
  { icon: 'check', title: 'Explain clearly', text: 'We describe your options in plain language so you can decide with confidence.' },
  { icon: 'shield', title: 'Treat with care', text: 'Careful planning, clean and protected working conditions, and attention to comfort at each step.' },
  { icon: 'calendar', title: 'Support afterwards', text: 'Clear aftercare guidance and follow-up so healing and results last.' },
];

export default async function AboutPage() {
  const { clinic } = await getClinicInfo();
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">About us</span>
          <h1>Dental care that feels personal</h1>
          <p className="lead">One Smile Dental Studio is a modern dental practice in DHA Phase 7, Karachi, led by Principal Dentist Doctor Ayesha.</p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div className="split-media">
            <Image src="/images/doctor-portrait.jpg" alt="Doctor Ayesha, Principal Dentist, during a dental procedure" width={1280} height={1600} sizes="(max-width: 900px) 90vw, 460px" className="rounded-img" priority />
          </div>
          <div>
            <span className="eyebrow">Principal Dentist</span>
            <h2>Doctor Ayesha</h2>
            <p className="quals">BDS, RDS, FCPS (Oral &amp; Maxillofacial Surgery)</p>
            <p>
              Doctor Ayesha is the Principal Dentist at One Smile Dental Studio. Her specialist surgical training
              shapes a careful, planned approach to treatment, whether she is helping a child through a first
              check-up, removing a troublesome wisdom tooth or planning an implant to replace a missing tooth.
            </p>
            <p>
              Patients can expect to be heard, to have their treatment explained in clear terms and to be cared for in a
              calm, hygienic environment.
            </p>
            <h3 className="mt">Qualifications</h3>
            <ul className="qual-list">
              <li><strong>BDS</strong><span>Bachelor of Dental Surgery</span></li>
              <li><strong>RDS</strong><span>Registered Dental Surgeon</span></li>
              <li><strong>FCPS</strong><span>Oral &amp; Maxillofacial Surgery</span></li>
            </ul>
            <div className="btn-row">
              <Link href="/book" className="btn btn-primary">Book Appointment</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionHead center eyebrow="Our philosophy" title="How we care for your smile" />
          <div className="grid-4">
            {PHILOSOPHY.map((p) => (
              <div className="card feature" key={p.title}>
                <div className="icon-badge"><Icon name={p.icon} size={26} /></div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead center eyebrow="Inside the studio" title="A caring, hygienic environment" />
          <div className="gallery">
            <figure>
              <Image src="/images/kids-dentistry.jpg" alt="Doctor Ayesha with a smiling young patient holding a toy and a brave-visitor card" width={1200} height={1600} sizes="(max-width: 900px) 90vw, 360px" />
              <figcaption>Friendly care for children</figcaption>
            </figure>
            <figure>
              <Image src="/images/doctor-with-patient.jpg" alt="Doctor Ayesha examining a patient using a dental light" width={900} height={1600} sizes="(max-width: 900px) 90vw, 360px" />
              <figcaption>Careful, gentle examinations</figcaption>
            </figure>
            <figure>
              <Image src="/images/implant-kit.jpg" alt="Sterile implant surgical kit laid out on a clean tray in the studio" width={1242} height={1552} sizes="(max-width: 900px) 90vw, 360px" />
              <figcaption>Planned, protected implant surgery</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <CtaBand clinic={clinic} />
    </>
  );
}
