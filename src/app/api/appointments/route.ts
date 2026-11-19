import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { json, readJson, failure } from '@/lib/api';
import { getDaySlots } from '@/lib/availability';
import { bookingSchema } from '@/lib/validation';
import { getClientIp, hashIp, makeAppointmentCode } from '@/lib/security';
import { nowInKarachi, slotKeyOf } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

const MAX_PER_IP_PER_HOUR = 5;
const MAX_OPEN_REQUESTS_PER_PHONE = 3;

function isUniqueViolation(e: unknown, field?: string) {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') return false;
  if (!field) return true;
  const target = e.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? '').includes(field);
}

const publicView = (a: { code: string; status: string; date: string; startTime: string }) => ({
  code: a.code,
  status: a.status,
  date: a.date,
  time: a.startTime,
});

async function handle(req: Request) {
  const body = await readJson(req);
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: 'Please check the highlighted fields.', fieldErrors: parsed.error.flatten().fieldErrors },
      400,
    );
  }
  const d = parsed.data;

  // Honeypot: pretend success so bots learn nothing, but save nothing.
  if (d.website) return json({ ok: true, appointment: { code: 'OSD-RECEIVED', status: 'PENDING', date: d.date, time: d.time } });

  const ipHash = hashIp(getClientIp(req));

  // Idempotency: the same submission token always returns the same appointment.
  const replay = await prisma.appointment.findUnique({ where: { submissionKey: d.submissionKey } });
  if (replay) return json({ ok: true, appointment: publicView(replay) });

  // Rate limiting (persistent, works on serverless).
  const recent = await prisma.appointment.count({
    where: { ipHash, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_PER_IP_PER_HOUR) {
    return json({ error: 'Too many booking requests. Please try again later or call the clinic.' }, 429);
  }
  const openForPhone = await prisma.appointment.count({
    where: { phone: d.phone, status: 'PENDING', date: { gte: nowInKarachi().date } },
  });
  if (openForPhone >= MAX_OPEN_REQUESTS_PER_PHONE) {
    return json(
      { error: 'You already have several pending requests. Please wait for our team to contact you, or call the clinic.' },
      429,
    );
  }

  // Re-validate the slot on the server (never trust the browser).
  const day = await getDaySlots(d.date);
  if (day.status !== 'open') {
    return json({ error: day.note ?? 'Bookings are not available for this date.', code: 'DAY_UNAVAILABLE' }, 409);
  }
  const slot = day.slots.find((s) => s.start === d.time);
  if (!slot || !slot.available) {
    return json({ error: 'Sorry, that time slot is no longer available. Please choose another.', code: 'SLOT_UNAVAILABLE' }, 409);
  }

  const { date: today } = nowInKarachi();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await prisma.appointment.create({
        data: {
          code: makeAppointmentCode(today),
          submissionKey: d.submissionKey,
          slotKey: slotKeyOf(d.date, slot.start),
          patientName: d.fullName,
          phone: d.phone,
          email: d.email,
          service: d.service,
          date: d.date,
          startTime: slot.start,
          endTime: slot.end,
          message: d.message,
          status: 'PENDING',
          ipHash,
        },
      });
      return json({ ok: true, appointment: publicView(created) }, 201);
    } catch (e) {
      if (isUniqueViolation(e, 'slotKey')) {
        return json({ error: 'Sorry, that time slot was just booked by someone else. Please choose another.', code: 'SLOT_UNAVAILABLE' }, 409);
      }
      if (isUniqueViolation(e, 'submissionKey')) {
        const again = await prisma.appointment.findUnique({ where: { submissionKey: d.submissionKey } });
        if (again) return json({ ok: true, appointment: publicView(again) });
      }
      if (isUniqueViolation(e, 'code')) continue; // extremely unlikely – retry with a new code
      throw e; // handled (logged + friendly message) by POST below
    }
  }
  return json({ error: 'Something went wrong. Please try again.', code: 'SERVER_ERROR' }, 500);
}

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    return failure(e, 'api/appointments');
  }
}
