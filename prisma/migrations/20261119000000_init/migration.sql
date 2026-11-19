-- One Smile Dental Studio – initial schema.
-- Written to match prisma/schema.prisma exactly, and idempotent (IF NOT EXISTS) so it is
-- safe to run on an empty database AND on one where some tables were already created.

DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "submissionKey" TEXT,
    "slotKey" TEXT,
    "patientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "service" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "message" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "rescheduledFrom" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClinicSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "clinicName" TEXT NOT NULL DEFAULT 'One Smile Dental Studio',
    "doctorName" TEXT NOT NULL DEFAULT 'Doctor Ayesha',
    "doctorPhone" TEXT NOT NULL DEFAULT '0332-3259577',
    "assistantPhone" TEXT NOT NULL DEFAULT '0331-6256127',
    "email" TEXT NOT NULL DEFAULT 'onesmilemystudio2021@gmail.com',
    "address" TEXT NOT NULL DEFAULT '4 C, D.H.A. Phase 7, Sehar Commercial Area, Phase 7, Defence Housing Authority, Karachi, Pakistan. 75500.',
    "facebookUrl" TEXT NOT NULL DEFAULT 'https://www.facebook.com/OSDRAYEESHAAA',
    "instagramUrl" TEXT NOT NULL DEFAULT 'https://www.instagram.com/onesmile.docayesha/',
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "bookingDisabledMessage" TEXT NOT NULL DEFAULT 'Online booking is temporarily unavailable. Please call or WhatsApp us to arrange an appointment.',
    "leadMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkingHour" (
    "weekday" INTEGER NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openTime" TEXT NOT NULL DEFAULT '17:00',
    "closeTime" TEXT NOT NULL DEFAULT '21:00',
    CONSTRAINT "WorkingHour_pkey" PRIMARY KEY ("weekday")
);

CREATE TABLE IF NOT EXISTS "BlockedDate" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'BLOCKED',
    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BlockedSlot" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    CONSTRAINT "BlockedSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LoginAttempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_code_key" ON "Appointment"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_submissionKey_key" ON "Appointment"("submissionKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_slotKey_key" ON "Appointment"("slotKey");
CREATE INDEX IF NOT EXISTS "Appointment_date_status_idx" ON "Appointment"("date", "status");
CREATE INDEX IF NOT EXISTS "Appointment_phone_idx" ON "Appointment"("phone");
CREATE INDEX IF NOT EXISTS "Appointment_status_idx" ON "Appointment"("status");
CREATE INDEX IF NOT EXISTS "Appointment_ipHash_createdAt_idx" ON "Appointment"("ipHash", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_username_key" ON "AdminUser"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "BlockedDate_date_key" ON "BlockedDate"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "BlockedSlot_date_startTime_key" ON "BlockedSlot"("date", "startTime");
CREATE INDEX IF NOT EXISTS "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");
CREATE INDEX IF NOT EXISTS "LoginAttempt_username_createdAt_idx" ON "LoginAttempt"("username", "createdAt");
