-- Capsules support (source: Bulk_Wholesale_Capsules_Draft.pdf, May 2026).
-- The sheet prices ONE band (1-49 bottles per SKU, $65). Its "RETAIL TIER" ($70) column is
-- the suggested resale price (MSRP) -- metadata, not a purchasable volume tier (confirmed
-- with the business 2026-07-15). Orders of 50+ capsules are intentionally unpriced and
-- require a manual quote.

-- New price list code for the capsules sheet.
ALTER TYPE "PriceListCode" ADD VALUE IF NOT EXISTS 'WHOLESALE_CAPSULES';

-- MSRP metadata on the variant. Nullable: only capsule SKUs have one today.
ALTER TABLE "ProductVariant" ADD COLUMN "suggestedRetailPrice" DECIMAL(12,2);
