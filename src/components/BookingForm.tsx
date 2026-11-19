'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SERVICES, serviceTitle } from '@/lib/services';
import { addDays, formatDateLong, formatTime12, nowInKarachi } from '@/lib/schedule';
import { telLink, waLink, WA_DEFAULT_MESSAGE } from '@/lib/contact';
import { Icon, WhatsAppIcon } from './Icon';

interface Slot { start: string; end: string; label: string; available: boolean }
interface DayInfo { status: string; note?: string; weekdayName: string; slots: Slot[] }
interface Props {
  preselect?: string;
  bookingEnabled: boolean;
  disabledMessage: string;
  maxAdvanceDays: number;
  doctorPhone: string;
  assistantPhone: string;
}
interface Done { code: string; date: string; time: string; service: string; name: string }

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export function BookingForm({ preselect, bookingEnabled, disabledMessage, maxAdvanceDays, doctorPhone, assistantPhone }: Props) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    service: SERVICES.some((s) => s.slug === preselect) ? (preselect as string) : '',
    date: '',
    time: '',
    message: '',
    website: '', // honeypot
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [day, setDay] = useState<DayInfo | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const submissionKey = useRef(newKey());
  const slotsReq = useRef(0);

  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  useEffect(() => {
    const t = nowInKarachi().date;
    setMinDate(t);
    setMaxDate(addDays(t, maxAdvanceDays));
  }, [maxAdvanceDays]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const loadSlots = useCallback(async (date: string) => {
    if (!date) {
      setSlotsError('');
      return setDay(null);
    }
    const id = ++slotsReq.current;
    setLoadingSlots(true);
    setSlotsError('');
    try {
      const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (id !== slotsReq.current) return;
      if (res.ok && data?.ok) {
        setDay(data);
      } else {
        setDay(null);
        setSlotsError(data?.error ?? 'We could not load the time slots. Please try again, or call or WhatsApp the clinic to book.');
      }
    } catch {
      if (id === slotsReq.current) {
        setDay(null);
        setSlotsError('Network problem. Please check your internet connection and try again.');
      }
    } finally {
      if (id === slotsReq.current) setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    setForm((f) => ({ ...f, time: '' }));
    loadSlots(form.date);
  }, [form.date, loadSlots]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    const local: Record<string, string> = {};
    if (form.fullName.trim().length < 2) local.fullName = 'Please enter your full name';
    if (!form.phone.trim()) local.phone = 'Please enter your phone number';
    if (!form.service) local.service = 'Please choose a service';
    if (!form.date) local.date = 'Please choose a date';
    else if (!form.time) local.time = 'Please choose a time slot';
    if (Object.keys(local).length) {
      setErrors(local);
      document.getElementById(`f-${Object.keys(local)[0]}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, submissionKey: submissionKey.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setDone({ code: data.appointment.code, date: form.date, time: form.time, service: form.service, name: form.fullName.trim() });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (data.fieldErrors) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.fieldErrors as Record<string, string[]>)) fe[k === 'time' ? 'time' : k] = v[0];
        setErrors(fe);
      }
      setFormError(data.error ?? 'Something went wrong. Please try again.');
      if (data.code === 'SLOT_UNAVAILABLE' || data.code === 'DAY_UNAVAILABLE') {
        setForm((f) => ({ ...f, time: '' }));
        loadSlots(form.date);
      }
    } catch {
      setFormError('Network problem. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    submissionKey.current = newKey();
    setDone(null);
    setForm({ fullName: '', phone: '', email: '', service: '', date: '', time: '', message: '', website: '' });
    setDay(null);
  }

  if (!bookingEnabled) {
    return (
      <div className="card notice-card">
        <h2>Online booking is paused</h2>
        <p>{disabledMessage}</p>
        <div className="btn-row">
          <a className="btn btn-primary" href={telLink(doctorPhone)}><Icon name="phone" size={18} /> Call Doctor</a>
          <a className="btn btn-wa" href={waLink(assistantPhone, WA_DEFAULT_MESSAGE)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} /> WhatsApp</a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card success-card" role="status">
        <div className="success-icon"><Icon name="check" size={30} /></div>
        <h2>Request received</h2>
        <p className="lead">
          Thank you for choosing One Smile Dental Studio. Your appointment request has been received. Our team will
          contact you to confirm your appointment.
        </p>
        <dl className="summary">
          <div><dt>Appointment ID</dt><dd className="mono">{done.code}</dd></div>
          <div><dt>Status</dt><dd><span className="pill pill-pending">Pending confirmation</span></dd></div>
          <div><dt>Patient</dt><dd>{done.name}</dd></div>
          <div><dt>Service</dt><dd>{serviceTitle(done.service)}</dd></div>
          <div><dt>Requested time</dt><dd>{formatDateLong(done.date)}, {formatTime12(done.time)}</dd></div>
        </dl>
        <p className="muted small">
          Please keep your appointment ID. Your slot is reserved for review but is <strong>not confirmed</strong> until our team contacts you.
        </p>
        <div className="btn-row">
          <a className="btn btn-wa" href={waLink(assistantPhone, `Hello One Smile Dental Studio, I have requested an appointment (ID ${done.code}). Please confirm.`)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={18} /> Message on WhatsApp
          </a>
          <a className="btn btn-outline" href={telLink(assistantPhone)}><Icon name="phone" size={18} /> Call Assistant</a>
          <button type="button" className="btn btn-ghost" onClick={reset}>Book another</button>
        </div>
      </div>
    );
  }

  const err = (k: string) => errors[k];
  const fieldProps = (k: string) => ({
    id: `f-${k}`,
    'aria-invalid': err(k) ? true : undefined,
    'aria-describedby': err(k) ? `e-${k}` : undefined,
  });

  return (
    <form className="card booking-form" onSubmit={onSubmit} noValidate>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="f-fullName">Full name <span className="req">*</span></label>
          <input {...fieldProps('fullName')} type="text" autoComplete="name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} maxLength={80} />
          {err('fullName') && <p className="field-error" id="e-fullName">{err('fullName')}</p>}
        </div>

        <div className="field">
          <label htmlFor="f-phone">Phone number <span className="req">*</span></label>
          <input {...fieldProps('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="03XX-XXXXXXX" value={form.phone} onChange={(e) => set('phone', e.target.value)} maxLength={20} />
          {err('phone') && <p className="field-error" id="e-phone">{err('phone')}</p>}
        </div>

        <div className="field">
          <label htmlFor="f-email">Email <span className="opt">(optional)</span></label>
          <input {...fieldProps('email')} type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={120} />
          {err('email') && <p className="field-error" id="e-email">{err('email')}</p>}
        </div>

        <div className="field">
          <label htmlFor="f-service">Dental service <span className="req">*</span></label>
          <select {...fieldProps('service')} value={form.service} onChange={(e) => set('service', e.target.value)}>
            <option value="">Select a service…</option>
            {SERVICES.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
          </select>
          {err('service') && <p className="field-error" id="e-service">{err('service')}</p>}
        </div>

        <div className="field field-wide">
          <label htmlFor="f-date">Appointment date <span className="req">*</span></label>
          <input {...fieldProps('date')} type="date" min={minDate} max={maxDate} value={form.date} onChange={(e) => set('date', e.target.value)} />
          {err('date') && <p className="field-error" id="e-date">{err('date')}</p>}
        </div>
      </div>

      <fieldset className="slots-box" aria-describedby="slots-help">
        <legend>Available time slots <span className="req">*</span></legend>
        <p id="slots-help" className="muted small">Clinic hours: Monday – Saturday, 5:00 PM – 9:00 PM (Sundays closed). Times are in Pakistan Standard Time.</p>

        {!form.date && <p className="slots-empty">Choose a date to see available times.</p>}
        {form.date && loadingSlots && <p className="slots-empty" aria-live="polite">Checking availability…</p>}
        {form.date && !loadingSlots && !day && (
          <div className="slots-empty" role="alert">
            <p>{slotsError || 'Could not load time slots. Please try again.'}</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => loadSlots(form.date)}>Try again</button>
          </div>
        )}
        {form.date && !loadingSlots && day && day.status !== 'open' && (
          <p className="slots-empty slots-closed" role="status">{day.note ?? 'No appointments available on this date.'}</p>
        )}
        {form.date && !loadingSlots && day?.status === 'open' && (
          <>
            <div className="slot-grid" role="radiogroup" aria-label="Available time slots">
              {day.slots.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  role="radio"
                  aria-checked={form.time === s.start}
                  disabled={!s.available}
                  className={`slot ${form.time === s.start ? 'is-selected' : ''}`}
                  onClick={() => set('time', s.start)}
                  title={s.available ? undefined : 'Not available'}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {!day.slots.some((s) => s.available) && <p className="slots-empty slots-closed">All slots are taken for this date. Please choose another day.</p>}
          </>
        )}
        {err('time') && <p className="field-error" id="e-time" role="alert">{err('time')}</p>}
      </fieldset>

      <div className="field">
        <label htmlFor="f-message">Additional message <span className="opt">(optional)</span></label>
        <textarea {...fieldProps('message')} rows={3} maxLength={500} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="Tell us briefly about your concern, e.g. tooth pain, child’s check-up…" />
      </div>

      {/* Honeypot – hidden from people and assistive tech */}
      <div className="hp" aria-hidden="true">
        <label>Website<input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} /></label>
      </div>

      {formError && <p className="form-error" role="alert">{formError}</p>}

      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
        {submitting ? 'Sending your request…' : 'Request Appointment'}
      </button>
      <p className="muted small center">
        Your request is reviewed by our team. It is not a confirmed appointment until we contact you.
      </p>
    </form>
  );
}
