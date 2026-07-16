-- v2 Phase 1 CRM: activities, tasks, leads, portal users, customer CRM fields.
-- STRICTLY ADDITIVE: this database is shared with the live v1 portal, so this migration only
-- creates new enum types/tables/indexes and adds nullable-or-defaulted columns. Nothing that
-- already exists is removed, retyped, or given a new name.
--
-- Pre-existing columns deliberately left untouched (they ship with the init migration and are
-- written by live v1 code): Customer."defaultPriceListCode" (TEXT, default 'BULK_RETAIL'),
-- Customer."paymentTerms" (TEXT, default 'Prepaid'), Invoice."dueDate" (TIMESTAMP(3), already
-- present and indexed). The "PaymentTerms" enum type is created now so follow-up additive work
-- can adopt it without a type migration.

-- CreateEnum
CREATE TYPE "PaymentTerms" AS ENUM ('PIA', 'NET15', 'NET30', 'NET60');

-- CreateEnum
CREATE TYPE "CustomerCrmStatus" AS ENUM ('LEAD', 'ACTIVE', 'DORMANT');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'EMAIL', 'VISIT', 'MEETING', 'NOTE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('MANUAL', 'REORDER_RADAR', 'ABANDONED_CART');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('MANUAL', 'WEBSITE');

-- CreateEnum
CREATE TYPE "LeadReviewStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PortalUserStatus" AS ENUM ('PENDING_INVITE', 'INVITED', 'ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "crmStatus" "CustomerCrmStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "shippingAddress" TEXT;

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "customerId" TEXT,
    "assigneeId" TEXT,
    "creatorId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "source" "TaskSource" NOT NULL DEFAULT 'MANUAL',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'MANUAL',
    "status" "LeadReviewStatus" NOT NULL DEFAULT 'OPEN',
    "matchedCustomerId" TEXT,
    "createdCustomerId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "status" "PortalUserStatus" NOT NULL DEFAULT 'PENDING_INVITE',
    "invitedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_customerId_occurredAt_idx" ON "Activity"("customerId", "occurredAt");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_dueDate_idx" ON "Task"("assigneeId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_email_key" ON "PortalUser"("email");

-- CreateIndex
CREATE INDEX "PortalUser_customerId_idx" ON "PortalUser"("customerId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_matchedCustomerId_fkey" FOREIGN KEY ("matchedCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdCustomerId_fkey" FOREIGN KEY ("createdCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
