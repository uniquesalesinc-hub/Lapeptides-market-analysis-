// Applies the retail-band pricing model (JJ 7/16/2026) to the LIVE shared database.
// Run with --dry-run to print the full plan without writing anything.
//
// What it does, idempotently, on each ACTIVE price list:
//  1. Ensures a tier 0 "Retail (1-19 units)" BAND row exists (only on lists where at
//     least one SKU has a lapeptides.net retail price).
//  2. Moves the first paid tier's floor to 20 where the retail band now covers 1-19:
//     Bulk Wholesale band 1 (1-99 -> 20-99), spray/cream flat tier (1+ -> 20+),
//     capsule band (1-49 -> 20-49). Bulk Retail Tier 1 is verified already at 20.
//  3. Inserts PriceListEntry rows for every SKU x list with a transcribed retail price
//     (prisma/seed-data/retail-source.ts via priceLists.ts; IGF-1 LR3 excluded pending
//     JJ's ruling). Existing entries are left untouched.
//
// Aborts non-zero on any ambiguity (missing list, unexpected tier shape, unknown SKU).
import { PrismaClient } from "@prisma/client";
import { buildFullCatalogEntries, tiersFor, RETAIL_BAND_TIER } from "../src/lib/pricing/priceLists.ts";

const DRY = process.argv.includes("--dry-run");
const prisma = new PrismaClient();
const CODES = ["BULK_RETAIL", "BULK_WHOLESALE", "WHOLESALE_SPRAYS", "WHOLESALE_CREAMS", "WHOLESALE_CAPSULES"];

const entries = buildFullCatalogEntries();
const fail = (msg) => {
  console.error("ABORT:", msg);
  process.exit(1);
};

let plannedTierCreates = 0;
let plannedTierUpdates = 0;
let plannedEntryInserts = 0;

for (const code of CODES) {
  const list = await prisma.priceList.findFirst({
    where: { code, isActive: true },
    include: { tiers: { orderBy: { tierNumber: "asc" } } },
  });
  if (!list) fail(`no active price list for ${code}`);

  const retailEntries = entries.filter((e) => e.priceListCode === code && e.pricesByTier.get(0) != null);
  console.log(`\n== ${code} (${list.name}) — ${retailEntries.length} SKUs with a retail price ==`);
  if (retailEntries.length === 0) {
    console.log("   nothing to do");
    continue;
  }

  // 1. Tier 0
  let tier0 = list.tiers.find((t) => t.tierNumber === 0);
  if (!tier0) {
    console.log(`   CREATE tier 0 "${RETAIL_BAND_TIER.label}" BAND 1-19`);
    plannedTierCreates++;
    if (!DRY) {
      tier0 = await prisma.pricingTier.create({
        data: {
          priceListId: list.id,
          tierNumber: 0,
          label: RETAIL_BAND_TIER.label,
          minimumBasis: "BAND",
          minQty: 1,
          maxQty: 19,
        },
      });
    }
  } else {
    console.log(`   tier 0 already exists (minQty ${tier0.minQty}, maxQty ${tier0.maxQty})`);
    if (tier0.minQty !== 1 || tier0.maxQty !== 19) fail(`${code} tier 0 has unexpected bounds`);
  }

  // 2. First paid tier floor -> 20 (per the tiersFor source of truth)
  const expected = tiersFor(code).filter((t) => t.tier !== 0);
  for (const exp of expected) {
    const dbTier = list.tiers.find((t) => t.tierNumber === exp.tier);
    if (!dbTier) fail(`${code} is missing tier ${exp.tier} in the database`);
    if (dbTier.minQty !== exp.minQty || (dbTier.maxQty ?? null) !== (exp.maxQty ?? null)) {
      console.log(
        `   UPDATE tier ${exp.tier}: minQty ${dbTier.minQty} -> ${exp.minQty}, maxQty ${dbTier.maxQty ?? "null"} -> ${exp.maxQty ?? "null"}, label -> "${exp.label}"`
      );
      plannedTierUpdates++;
      if (!DRY) {
        await prisma.pricingTier.update({
          where: { id: dbTier.id },
          data: { minQty: exp.minQty, maxQty: exp.maxQty, label: exp.label },
        });
      }
    }
  }

  // 3. Retail entries
  const t0Id = tier0?.id;
  for (const e of retailEntries) {
    const variant = await prisma.productVariant.findFirst({ where: { sku: e.sku }, select: { id: true } });
    if (!variant) fail(`no ProductVariant for SKU ${e.sku}`);
    const existing = t0Id
      ? await prisma.priceListEntry.findFirst({
          where: { priceListId: list.id, pricingTierId: t0Id, productVariantId: variant.id },
        })
      : null;
    if (existing) continue;
    plannedEntryInserts++;
    if (DRY) {
      console.log(`   INSERT retail entry ${e.sku} @ $${e.pricesByTier.get(0)}`);
    } else {
      await prisma.priceListEntry.create({
        data: {
          priceListId: list.id,
          pricingTierId: t0Id,
          productVariantId: variant.id,
          unitPrice: e.pricesByTier.get(0),
        },
      });
    }
  }
}

console.log(
  `\n${DRY ? "DRY RUN - would apply" : "APPLIED"}: ${plannedTierCreates} tier creates, ${plannedTierUpdates} tier updates, ${plannedEntryInserts} retail price entries.`
);
await prisma.$disconnect();
