-- Adds WhatsApp notification tracking. Purely additive: no existing table or row is touched.
-- Idempotent (IF NOT EXISTS) so it is safe to re-run.

CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "appointmentId" TEXT,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'whatsapp_cloud',
    "providerMessageId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DailyReport" (
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENDING',
    "total" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("date")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationLog_dedupeKey_key" ON "NotificationLog"("dedupeKey");
CREATE INDEX IF NOT EXISTS "NotificationLog_appointmentId_idx" ON "NotificationLog"("appointmentId");
CREATE INDEX IF NOT EXISTS "NotificationLog_kind_status_createdAt_idx" ON "NotificationLog"("kind", "status", "createdAt");
