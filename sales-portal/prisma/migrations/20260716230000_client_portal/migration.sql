-- v2 Phase 2 client portal: quote origin tracking + recorded RUO acknowledgment on client
-- orders, and the persistent server-side storefront cart (one active cart per portal user).
-- STRICTLY ADDITIVE: this database is shared with the live v1 portal, so this migration only
-- creates one new enum type, two new tables with their indexes and foreign keys, and adds
-- two defaulted/nullable columns to "Quote". Nothing that already exists is removed,
-- retyped, or given a new name. Existing rows get origin = 'REP' via the column default.

-- CreateEnum
CREATE TYPE "QuoteOrigin" AS ENUM ('REP', 'CLIENT');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "origin" "QuoteOrigin" NOT NULL DEFAULT 'REP',
ADD COLUMN     "ruoAcknowledgedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ClientCart" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientCart_portalUserId_key" ON "ClientCart"("portalUserId");

-- CreateIndex
CREATE INDEX "ClientCart_customerId_idx" ON "ClientCart"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCartItem_cartId_productVariantId_key" ON "ClientCartItem"("cartId", "productVariantId");

-- AddForeignKey
ALTER TABLE "ClientCart" ADD CONSTRAINT "ClientCart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCart" ADD CONSTRAINT "ClientCart_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCartItem" ADD CONSTRAINT "ClientCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "ClientCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCartItem" ADD CONSTRAINT "ClientCartItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
