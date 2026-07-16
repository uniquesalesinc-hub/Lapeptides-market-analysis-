-- v2 Phase 1.5 brand kit: per-customer brand assets (Postgres bytea) + structured brand
-- details on Customer (exact hex values + notes) so label/logo production stops drifting.
-- STRICTLY ADDITIVE: this database is shared with the live v1 portal, so this migration only
-- creates one new enum type, one new table with its index and foreign keys, and adds nullable
-- columns to "Customer". Nothing that already exists is removed, retyped, or given a new name.

-- CreateEnum
CREATE TYPE "BrandAssetKind" AS ENUM ('LOGO', 'SOCIAL_MEDIA', 'VIAL_LABEL', 'OTHER');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "brandAccentHex" TEXT,
ADD COLUMN     "brandFontNotes" TEXT,
ADD COLUMN     "brandNotes" TEXT,
ADD COLUMN     "brandPrimaryHex" TEXT,
ADD COLUMN     "brandSecondaryHex" TEXT;

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" "BrandAssetKind" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandAsset_customerId_kind_idx" ON "BrandAsset"("customerId", "kind");

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAsset" ADD CONSTRAINT "BrandAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
