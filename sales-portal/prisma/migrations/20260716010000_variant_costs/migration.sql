-- Hard costs (COGS) per variant per volume band. Admin-only data: application code must
-- never expose this table to SALES_REP sessions.
CREATE TABLE "VariantCost" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "tierNumber" INTEGER NOT NULL,
    "minQty" INTEGER NOT NULL,
    "maxQty" INTEGER,
    "unitCost" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "VariantCost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VariantCost_variantId_tierNumber_key" ON "VariantCost"("variantId", "tierNumber");
CREATE INDEX "VariantCost_variantId_idx" ON "VariantCost"("variantId");
ALTER TABLE "VariantCost" ADD CONSTRAINT "VariantCost_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
