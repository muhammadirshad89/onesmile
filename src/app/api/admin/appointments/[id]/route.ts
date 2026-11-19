import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { json, readJson, requireAdmin } from '@/lib/api';
import { getDaySlots } from '@/lib/availability';
import { rescheduleSchema } from '@/lib/validation';
import { slotKeyOf } from '@/lib/schedule';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const ACTIONS = ['confirm', 'reject', 'cancel', 'complete', 'reschedule', 'note', 'reopen'] as const;
type Action = (typeof ACTIONS)[number];

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await ctx.params;

  const body = (await readJson(req)) as { action?: Action; date?: string; time?: string; adminNote?: string } | null;
  const action = body?.action;
  if (!action || !ACTIONS.includes(action)) return json({ error: 'Unknown action' }, 400);

  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) return json({ error: 'Appointment not found' }, 404);

  const note = typeof body?.adminNote === 'string' ? body.adminNote.trim().slice(0, 500) : undefined;
  const slotKey = slotKeyOf(appt.date, appt.startTime);

  try {
    switch (action) {
      case 'confirm': {
        if (!['PENDING'].includes(appt.status)) return json({ error: 'Only pending requests can be confirmed.' }, 409);
        const u = await prisma.appointment.update({ where: { id }, data: { status: 'CONFIRMED', ...(note !== undefined ? { adminNote: note } : {}) } });
        return json({ appointment: u });
      }
      case 'complete': {
        if (appt.status !== 'CONFIRMED') return json({ error: 'Only confirmed appointments can be marked completed.' }, 409);
        const u = await prisma.appointment.update({ where: { id }, data: { status: 'COMPLETED' } });
        return json({ appointment: u });
      }
      case 'reject':
      case 'cancel': {
        if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(appt.status)) return json({ error: 'This appointment can no longer be changed.' }, 409);
        const u = await prisma.appointment.update({
          where: { id },
          data: { status: action === 'reject' ? 'REJECTED' : 'CANCELLED', slotKey: null, ...(note !== undefined ? { adminNote: note } : {}) },
        });
        return json({ appointment: u });
      }
      case 'reopen': {
        // Put a rejected/cancelled request back to PENDING if its slot is still free.
        if (!['REJECTED', 'CANCELLED'].includes(appt.status)) return json({ error: 'Only rejected or cancelled appointments can be reopened.' }, 409);
        const day = await getDaySlots(appt.date, { adminMode: true });
        const free = day.slots.find((s) => s.start === appt.startTime)?.available;
        if (!free) return json({ error: 'That slot is no longer free. Reschedule it to a new time instead.' }, 409);
        const u = await prisma.appointment.update({ where: { id }, data: { status: 'PENDING', slotKey } });
        return json({ appointment: u });
      }
      case 'note': {
        const u = await prisma.appointment.update({ where: { id }, data: { adminNote: note ?? null } });
        return json({ appointment: u });
      }
      case 'reschedule': {
        if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(appt.status)) return json({ error: 'This appointment can no longer be rescheduled.' }, 409);
        const parsed = rescheduleSchema.safeParse({ date: body?.date, time: body?.time });
        if (!parsed.success) return json({ error: 'Choose a valid date and time.' }, 400);
        const day = await getDaySlots(parsed.data.date, { excludeAppointmentId: id, adminMode: true });
        if (day.status !== 'open') return json({ error: day.note ?? 'The clinic is not open on that date.' }, 409);
        const slot = day.slots.find((s) => s.start === parsed.data.time);
        if (!slot || !slot.available) return json({ error: 'That time slot is not available.' }, 409);
        const u = await prisma.appointment.update({
          where: { id },
          data: {
            date: parsed.data.date,
            startTime: slot.start,
            endTime: slot.end,
            slotKey: slotKeyOf(parsed.data.date, slot.start),
            rescheduledFrom: `${appt.date} ${appt.startTime}`,
            ...(note !== undefined ? { adminNote: note } : {}),
          },
        });
        return json({ appointment: u });
      }
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return json({ error: 'That slot has just been taken by another appointment.' }, 409);
    }
    console.error(e);
    return json({ error: 'Could not update the appointment.' }, 500);
  }
  return json({ error: 'Unknown action' }, 400);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await ctx.params;
  try {
    await prisma.appointment.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: 'Appointment not found' }, 404);
  }
}
