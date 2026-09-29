-- CreateEnum safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR');
    END IF;
END $$;

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'WAITING_FOR_REQUESTER';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable
ALTER TABLE "RequesterUser"
    ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'REQUESTER',
    ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
    ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Session" (
    "tokenHash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionVersion" INTEGER NOT NULL,
    "csrfToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- AlterTable
ALTER TABLE "Ticket"
    ADD COLUMN IF NOT EXISTS "itPriority" "Priority",
    ADD COLUMN IF NOT EXISTS "ticketOwnerId" INTEGER,
    ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS "appearsResolvedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "appearsResolvedById" INTEGER;

-- Backfill itPriority from requestedPriority
UPDATE "Ticket" SET "itPriority" = "requestedPriority" WHERE "itPriority" IS NULL;

-- Set itPriority NOT NULL
ALTER TABLE "Ticket" ALTER COLUMN "itPriority" SET NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PublicComment" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seedKey" TEXT,

    CONSTRAINT "PublicComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InternalNote" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seedKey" TEXT,

    CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Ticket_ticketOwnerId_idx" ON "Ticket"("ticketOwnerId");
CREATE INDEX IF NOT EXISTS "Ticket_itPriority_idx" ON "Ticket"("itPriority");
CREATE INDEX IF NOT EXISTS "Ticket_updatedAt_idx" ON "Ticket"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PublicComment_seedKey_key" ON "PublicComment"("seedKey");
CREATE INDEX IF NOT EXISTS "PublicComment_ticketId_createdAt_id_idx" ON "PublicComment"("ticketId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InternalNote_seedKey_key" ON "InternalNote"("seedKey");
CREATE INDEX IF NOT EXISTS "InternalNote_ticketId_createdAt_id_idx" ON "InternalNote"("ticketId", "createdAt", "id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
        ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RequesterUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_ticketOwnerId_fkey') THEN
        ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketOwnerId_fkey" FOREIGN KEY ("ticketOwnerId") REFERENCES "RequesterUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_appearsResolvedById_fkey') THEN
        ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_appearsResolvedById_fkey" FOREIGN KEY ("appearsResolvedById") REFERENCES "RequesterUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PublicComment_ticketId_fkey') THEN
        ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PublicComment_authorId_fkey') THEN
        ALTER TABLE "PublicComment" ADD CONSTRAINT "PublicComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternalNote_ticketId_fkey') THEN
        ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InternalNote_authorId_fkey') THEN
        ALTER TABLE "InternalNote" ADD CONSTRAINT "InternalNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "RequesterUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
