/**
 * Optional: `npm run db:seed`
 * Creates default clinic settings, Mon–Sat 5–9 PM working hours (Sunday closed)
 * and the first admin account from ADMIN_USERNAME / ADMIN_INITIAL_PASSWORD.
 * (The app also does all of this lazily on first use, so seeding is not required.)
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.clinicSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (let weekday = 0; weekday <= 6; weekday++) {
    await prisma.workingHour.upsert({
      where: { weekday },
      update: {},
      create: { weekday, isOpen: weekday !== 0, openTime: '17:00', closeTime: '21:00' },
    });
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!username || !password) {
    console.warn('ADMIN_USERNAME / ADMIN_INITIAL_PASSWORD not set – skipping admin creation.');
    return;
  }
  const existing = await prisma.adminUser.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin "${username}" already exists – left unchanged.`);
    return;
  }
  await prisma.adminUser.create({
    data: { username, passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true },
  });
  console.log(`Admin "${username}" created. The password must be changed at first login.`);
}

main().finally(() => prisma.$disconnect());
