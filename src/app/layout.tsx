import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { SITE_URL } from '@/lib/clinic';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'One Smile Dental Studio | Dentist in DHA Phase 7, Karachi',
    template: '%s | One Smile Dental Studio',
  },
  description:
    'One Smile Dental Studio in DHA Phase 7, Karachi. Personalised dental care by Doctor Ayesha (BDS, RDS, FCPS Oral & Maxillofacial Surgery): general and paediatric dentistry, implants, extractions and wisdom tooth removal. Book online.',
  applicationName: 'One Smile Dental Studio',
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    siteName: 'One Smile Dental Studio',
    title: 'One Smile Dental Studio | Dentist in DHA Phase 7, Karachi',
    description: 'Your smile deserves expert care. Book an appointment with Doctor Ayesha at One Smile Dental Studio, DHA Phase 7, Karachi.',
    images: [{ url: '/images/doctor-portrait.jpg', width: 1280, height: 1600, alt: 'Doctor Ayesha at One Smile Dental Studio' }],
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: '#0B2540',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}
