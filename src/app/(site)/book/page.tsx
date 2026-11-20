import type { Metadata } from 'next';
import { BookingForm } from '@/components/BookingForm';
import { Icon } from '@/components/Icon';
import { Timings } from '@/components/Parts';
import { getClinicInfo } from '@/lib/clinic';

export const metadata: Metadata = {
  title: 'Book a Dental Appointment',
  description: 'Request an appointment with Doctor Ayesha at One Smile Dental Studio, DHA Phase 7, Karachi. Choose your service, date and an available time slot.',
  alternates: { canonical: '/book' },
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const { clinic, hours } = await getClinicInfo();
  return (
    <>
      <section className="page-hero compact">
        <div className="container">
          <span className="eyebrow">Appointments</span>
          <h1>Book your appointment</h1>
          <p className="lead">Choose a service, pick a date and select an available time. Your appointment is confirmed instantly.</p>
        </div>
      </section>
      <section className="section">
        <div className="container book-layout">
          <BookingForm
            preselect={service}
            bookingEnabled={clinic.bookingEnabled}
            disabledMessage={clinic.bookingDisabledMessage}
            maxAdvanceDays={clinic.maxAdvanceDays}
            doctorPhone={clinic.doctorPhone}
            assistantPhone={clinic.assistantPhone}
          />
          <aside className="book-aside">
            <div className="card pad-lg">
              <h2 className="h3"><Icon name="clock" size={22} /> Clinic timings</h2>
              <Timings hours={hours} />
            </div>
            <div className="card pad-lg">
              <h2 className="h3"><Icon name="check" size={22} /> How it works</h2>
              <ol className="steps">
                <li>Send your request with your preferred date and time.</li>
                <li>Our team reviews it and contacts you.</li>
                <li>Your appointment is confirmed once we speak to you.</li>
              </ol>
            </div>
            <div className="card pad-lg">
              <h2 className="h3">Prefer to talk?</h2>
              <p>Call Doctor: <a href={`tel:${clinic.doctorPhone.replace(/[^\d+]/g, '')}`}>{clinic.doctorPhone}</a></p>
              <p>Call Assistant: <a href={`tel:${clinic.assistantPhone.replace(/[^\d+]/g, '')}`}>{clinic.assistantPhone}</a></p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
