/**
 * apply-submoq.mjs
 *
 * Data migration for the sub-MOQ rule (JJ + Spencer field call, 7/16/2026):
 * Bulk Retail Tier 1 minimum drops from 20 to 5 for ALL products, overriding the
 * printed sheets. Tier prices are NOT changed - quantities 5-19 simply price at the
 * existing Tier 1 sheet price. Bulk Wholesale bands, sprays, creams, and capsules
 * are untouched. Historical (inactive) price list versions are deliberately left
 * as-is; only the currently ACTIVE Bulk Retail list is updated, matching what the
 * runtime resolver reads (resolveLineItemPricing -> priceList.findFirst isActive).
 *
 * Existing quote/invoice line items are pricing SNAPSHOTS (unitPrice, lineTotal,
 * pricingTierLabel stored on the row) and are never recomputed - old quotes stay
 * exactly as sold. This script touches ONLY the PricingTier row.
 *
 * Safety: aborts with a nonzero exit unless the pre-count finds EXACTLY ONE
 * matching tier row. Prints the exact SQL before executing it.
 *
 * Run with:  node scripts/apply-submoq.mjs   (from sales-portal/)
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_MIN_QTY = 5;
const NEW_LABEL = "Bulk Retail - Tier 1 (5+ bottles)"; // matches tiersFor() generated label

const PRE_COUNT_SQL = `
SELECT pt."id", pt."label", pt."minQty", pt."maxQty", pl."name" AS "priceListName", pl."effectiveDate"
FROM "PricingTier" pt
JOIN "PriceList" pl ON pl."id" = pt."priceListId"
WHERE pl."code" = 'BULK_RETAIL'
  AND pl."isActive" = true
  AND pt."tierNumber" = 1;
`.trim();

const UPDATE_SQL = `
UPDATE "PricingTier" AS pt
SET "minQty" = ${NEW_MIN_QTY},
    "label" = '${NEW_LABEL}'
FROM "PriceList" AS pl
WHERE pt."priceListId" = pl."id"
  AND pl."code" = 'BULK_RETAIL'
  AND pl."isActive" = true
  AND pt."tierNumber" = 1;
`.trim();

async function main() {
  console.log("Sub-MOQ data migration: Bulk Retail Tier 1 minQty 20 -> 5 (JJ + Spencer, 7/16/2026)");
  console.log("\n-- Pre-count query:\n" + PRE_COUNT_SQL + "\n");

  const rows = await prisma.$queryRaw(Prisma.raw(PRE_COUNT_SQL));
  console.log("Pre-count result:", JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? Number(v) : v), 2));

  if (!Array.isArray(rows) || rows.length !== 1) {
    console.error(
      `ABORT: expected exactly 1 active BULK_RETAIL tier-1 row, found ${Array.isArray(rows) ? rows.length : "?"}. No changes made.`
    );
    process.exit(1);
  }

  const current = rows[0];
  if (current.minQty === NEW_MIN_QTY && current.label === NEW_LABEL) {
    console.log("Row already has minQty=5 and the new label - nothing to do. Exiting cleanly.");
    process.exit(0);
  }
  if (current.minQty !== 20 && current.minQty !== NEW_MIN_QTY) {
    console.error(
      `ABORT: active tier-1 minQty is ${current.minQty}, not the expected 20. Investigate before applying. No changes made.`
    );
    process.exit(1);
  }

  console.log("\n-- Executing UPDATE:\n" + UPDATE_SQL + "\n");
  const updated = await prisma.$executeRaw(Prisma.raw(UPDATE_SQL));
  console.log(`Rows updated: ${updated}`);

  if (updated !== 1) {
    console.error(`ABORT-STATE WARNING: expected 1 row updated, got ${updated}. Verify the PricingTier table manually.`);
    process.exit(1);
  }

  const verify = await prisma.$queryRaw(Prisma.raw(PRE_COUNT_SQL));
  console.log("Post-update state:", JSON.stringify(verify, (_, v) => (typeof v === "bigint" ? Number(v) : v), 2));
  console.log("Done. Bulk Retail Tier 1 floor is now 5 units in the database.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
