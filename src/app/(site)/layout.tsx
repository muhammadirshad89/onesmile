import { Footer } from '@/components/Footer';
import { FloatingWhatsApp } from '@/components/FloatingWhatsApp';
import { Header } from '@/components/Header';
import { JsonLd } from '@/components/JsonLd';
import { getClinicInfo } from '@/lib/clinic';

// Clinic info / timings edited in the admin panel appear on the public site within 5 minutes.
export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { clinic, hours } = await getClinicInfo();
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header doctorPhone={clinic.doctorPhone} clinicName={clinic.clinicName} />
      <main id="main">{children}</main>
      <Footer clinic={clinic} hours={hours} />
      <FloatingWhatsApp doctorPhone={clinic.doctorPhone} assistantPhone={clinic.assistantPhone} />
      <JsonLd clinic={clinic} hours={hours} />
    </>
  );
}
