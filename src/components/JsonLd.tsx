import type { ClinicInfo } from '@/lib/clinic';
import { SITE_URL } from '@/lib/clinic';
import type { HourRule } from '@/lib/schedule';
import { SERVICES } from '@/lib/services';

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** DentalClinic + Dentist structured data. Only facts supplied by the clinic – no ratings or reviews. */
export function JsonLd({ clinic, hours }: { clinic: ClinicInfo; hours: HourRule[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['DentalClinic', 'LocalBusiness'],
        '@id': `${SITE_URL}/#clinic`,
        name: clinic.clinicName,
        url: SITE_URL,
        image: `${SITE_URL}/images/logo.jpg`,
        logo: `${SITE_URL}/images/logo.jpg`,
        telephone: ['+92' + clinic.doctorPhone.replace(/\D/g, '').slice(1), '+92' + clinic.assistantPhone.replace(/\D/g, '').slice(1)],
        email: clinic.email,
        address: {
          '@type': 'PostalAddress',
          streetAddress: '4 C, Sehar Commercial Area, D.H.A. Phase 7',
          addressLocality: 'Karachi',
          addressRegion: 'Sindh',
          postalCode: '75500',
          addressCountry: 'PK',
        },
        areaServed: ['DHA Phase 7, Karachi', 'Defence Housing Authority, Karachi', 'Clifton, Karachi'],
        openingHoursSpecification: hours
          .filter((h) => h.isOpen)
          .map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAY[h.weekday], opens: h.openTime, closes: h.closeTime })),
        sameAs: [clinic.facebookUrl, clinic.instagramUrl],
        medicalSpecialty: 'Dentistry',
        availableService: SERVICES.map((s) => ({ '@type': 'MedicalProcedure', name: s.title })),
        employee: { '@id': `${SITE_URL}/#doctor` },
      },
      {
        '@type': 'Dentist',
        '@id': `${SITE_URL}/#doctor`,
        name: clinic.doctorName,
        jobTitle: 'Principal Dentist',
        description: 'BDS, RDS, FCPS (Oral & Maxillofacial Surgery)',
        worksFor: { '@id': `${SITE_URL}/#clinic` },
        image: `${SITE_URL}/images/doctor-portrait.jpg`,
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
