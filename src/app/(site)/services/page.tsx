import type { Metadata } from 'next';
import { CtaBand, ServiceCard } from '@/components/Parts';
import { getClinicInfo } from '@/lib/clinic';
import { SERVICES } from '@/lib/services';

export const metadata: Metadata = {
  title: 'Dental Services in DHA Phase 7, Karachi',
  description:
    'General dentistry, paediatric dentistry, implantology and prosthesis, extraction and minor oral surgery, and wisdom tooth removal at One Smile Dental Studio, DHA Phase 7, Karachi.',
  alternates: { canonical: '/services' },
};

export default async function ServicesPage() {
  const { clinic } = await getClinicInfo();
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Our services</span>
          <h1>Dental treatments, explained clearly</h1>
          <p className="lead">Professional care across five treatment areas, with Doctor Ayesha’s surgical training behind every plan.</p>
        </div>
      </section>
      <section className="section">
        <div className="container grid-services detailed">
          {SERVICES.map((s) => <ServiceCard key={s.slug} s={s} detailed />)}
        </div>
      </section>
      <CtaBand clinic={clinic} />
    </>
  );
}
