import { z } from 'zod';
import { normalizePhone } from './contact';
import { isValidDateStr, isValidTimeStr } from './schedule';
import { SERVICE_SLUGS } from './services';

const phoneField = z
  .string({ required_error: 'Please enter your phone number' })
  .trim()
  .refine((v) => normalizePhone(v) !== null, 'Please enter a valid phone number, e.g. 0332-1234567')
  .transform((v) => normalizePhone(v) as string);

export const bookingSchema = z.object({
  fullName: z
    .string({ required_error: 'Please enter your full name' })
    .trim()
    .min(2, 'Please enter your full name')
    .max(80, 'Name is too long')
    .regex(/^[\p{L}\p{M}\s.'’-]+$/u, 'Name can only contain letters and spaces'),
  phone: phoneField,
  email: z
    .string()
    .trim()
    .max(120, 'Email is too long')
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, 'Please enter a valid email address'),
  service: z.enum(SERVICE_SLUGS, { errorMap: () => ({ message: 'Please choose a service' }) }),
  date: z.string().refine(isValidDateStr, 'Please choose a valid date'),
  time: z.string().refine(isValidTimeStr, 'Please choose a time slot'),
  message: z
    .string()
    .trim()
    .max(500, 'Message must be 500 characters or fewer')
    .optional()
    .transform((v) => (v ? v : undefined)),
  submissionKey: z.string().min(16).max(64),
  /** honeypot – real users never fill this */
  website: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(100)
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/\d/, 'Include a number')
  .regex(/[^A-Za-z0-9]/, 'Include a symbol');

export const rescheduleSchema = z.object({
  date: z.string().refine(isValidDateStr),
  time: z.string().refine(isValidTimeStr),
});

export const hoursSchema = z.array(
  z
    .object({
      weekday: z.number().int().min(0).max(6),
      isOpen: z.boolean(),
      openTime: z.string().refine(isValidTimeStr),
      closeTime: z.string().refine(isValidTimeStr),
    })
    .refine((h) => !h.isOpen || h.openTime < h.closeTime, 'Opening time must be before closing time'),
).length(7);

export const settingsSchema = z.object({
  clinicName: z.string().trim().min(2).max(80),
  doctorName: z.string().trim().min(2).max(80),
  doctorPhone: z.string().trim().refine((v) => normalizePhone(v) !== null, 'Invalid doctor phone'),
  assistantPhone: z.string().trim().refine((v) => normalizePhone(v) !== null, 'Invalid assistant phone'),
  email: z.string().trim().email().max(120),
  address: z.string().trim().min(5).max(300),
  facebookUrl: z.string().trim().url().max(300),
  instagramUrl: z.string().trim().url().max(300),
  slotMinutes: z.number().int().min(10).max(120),
  bookingEnabled: z.boolean(),
  bookingDisabledMessage: z.string().trim().min(3).max(300),
  leadMinutes: z.number().int().min(0).max(1440),
  maxAdvanceDays: z.number().int().min(1).max(365),
});
