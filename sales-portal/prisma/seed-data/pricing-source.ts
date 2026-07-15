/**
 * NORMALIZED WHOLESALE PRICING SOURCE — LA Peptides
 *
 * This file is the machine-readable counterpart to `sales-portal/docs/PRICING_AUDIT.md`.
 * Every price below is transcribed verbatim from one of the ten uploaded PDFs:
 *   BulkRetail_Tier1/2/3.pdf, BulkWholesale_Tier1-5.pdf, Wholesale_Sprays.pdf, Wholesale_Creams.pdf
 * (all dated May 2026). Nothing here is estimated, interpolated, or invented.
 *
 * DO NOT hand-edit prices in this file to "fix" perceived inconsistencies — the known
 * anomalies (flat-priced blends, the TB-500 boundary inversion, the steep Retatrutide 40mg /
 * Tesamorelin 20mg curves) are intentionally preserved as-is and documented in the audit.
 * Corrections must come from a replacement source file processed through the Admin Pricing
 * "upload new pricing file" workflow, which preserves history rather than overwriting it.
 *
 * Bulk Retail and Bulk Wholesale are modeled as two INDEPENDENT price lists (see audit §4.1)
 * — never merged into a single 8-step ladder. Each Customer/Quote is assigned exactly one
 * price list to quote from.
 */

export type ProductCategory =
  | "INJECTABLE_PEPTIDE"
  | "INJECTABLE_GLP"
  | "INJECTABLE_BIOREGULATOR"
  | "INJECTABLE_BLEND"
  | "NASAL_SPRAY"
  | "TOPICAL_CREAM";

export const PRICE_LIST_CODES = {
  BULK_RETAIL: "BULK_RETAIL",
  BULK_WHOLESALE: "BULK_WHOLESALE",
  WHOLESALE_SPRAYS: "WHOLESALE_SPRAYS",
  WHOLESALE_CREAMS: "WHOLESALE_CREAMS",
} as const;
export type PriceListCode = (typeof PRICE_LIST_CODES)[keyof typeof PRICE_LIST_CODES];

/** Bulk Retail: floor-only tiers, no stated upper bound — best (highest) qualifying tier wins. */
export const BULK_RETAIL_TIERS = [
  { tier: 1, label: "Tier 1", minQty: 20, maxQty: null as number | null },
  { tier: 2, label: "Tier 2", minQty: 50, maxQty: null as number | null },
  { tier: 3, label: "Tier 3", minQty: 75, maxQty: null as number | null },
];

/** Bulk Wholesale: explicit bands exactly as printed on each sheet. */
export const BULK_WHOLESALE_TIERS = [
  { tier: 1, label: "Tier 1", minQty: 1, maxQty: 99 },
  { tier: 2, label: "Tier 2", minQty: 100, maxQty: 299 },
  { tier: 3, label: "Tier 3", minQty: 300, maxQty: 499 },
  { tier: 4, label: "Tier 4", minQty: 500, maxQty: 999 },
  { tier: 5, label: "Tier 5", minQty: 1000, maxQty: null as number | null },
];

/** Sprays/Creams: floor-only tiers per sheet language ("50+ Units", "100+ Units", "200+ Units"). */
export const SPRAY_CREAM_TIERS = [
  { tier: 1, label: "Tier 1", minQty: 50, maxQty: null as number | null },
  { tier: 2, label: "Tier 2", minQty: 100, maxQty: null as number | null },
  { tier: 3, label: "Tier 3", minQty: 200, maxQty: null as number | null },
];

export interface BulkCatalogItem {
  name: string;
  size: string;
  category: Extract<
    ProductCategory,
    "INJECTABLE_PEPTIDE" | "INJECTABLE_GLP" | "INJECTABLE_BIOREGULATOR" | "INJECTABLE_BLEND"
  >;
  /** [Tier1, Tier2, Tier3] matching BULK_RETAIL_TIERS */
  bulkRetail: [number, number, number];
  /** [Tier1, Tier2, Tier3, Tier4, Tier5] matching BULK_WHOLESALE_TIERS */
  bulkWholesale: [number, number, number, number, number];
}

export interface SprayCreamCatalogItem {
  name: string;
  category: Extract<ProductCategory, "NASAL_SPRAY" | "TOPICAL_CREAM">;
  description?: string;
  /** [Tier1 (50+), Tier2 (100+), Tier3 (200+)] */
  prices: [number, number, number];
}

/** Deterministic SKU generator from item name + size — the source sheets identify products by
 *  Item Name + Size, not a coded SKU, so the app constructs a stable machine SKU from those. */
export function makeSku(name: string, size: string): string {
  const namePart = name
    .toUpperCase()
    .replace(/[^A-Z0-9/]+/g, "")
    .replace(/\//g, "");
  const sizePart = size.toUpperCase().replace(/[^A-Z0-9/]+/g, "").replace(/\//g, "-");
  return `${namePart}-${sizePart}`;
}

// ---------------------------------------------------------------------------
// PEPTIDES
// ---------------------------------------------------------------------------
export const PEPTIDES: BulkCatalogItem[] = [
  { name: "BPC-157", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [26.0, 24.5, 23.0], bulkWholesale: [21.0, 16.5, 15.0, 13.5, 12.0] },
  { name: "BPC-157", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [37.5, 35.0, 32.5], bulkWholesale: [30.0, 22.0, 17.5, 16.0, 13.0] },
  { name: "BPC-157", size: "15mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [49.0, 45.5, 42.0], bulkWholesale: [39.0, 31.5, 27.5, 23.5, 18.0] },
  { name: "BPC-157", size: "20mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [60.0, 56.0, 52.0], bulkWholesale: [48.0, 38.5, 32.5, 27.0, 20.0] },
  { name: "TB-500", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [37.5, 35.0, 32.5], bulkWholesale: [30.0, 25.0, 22.5, 18.0, 16.0] },
  { name: "TB-500", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [45.0, 40.0, 35.0], bulkWholesale: [37.5, 35.5, 32.5, 29.0, 26.0] },
  { name: "Ipamorelin", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [22.5, 21.0, 19.5], bulkWholesale: [18.0, 16.5, 15.0, 13.5, 12.0] },
  { name: "Ipamorelin", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [30.0, 28.0, 26.0], bulkWholesale: [24.0, 22.0, 20.0, 18.0, 14.0] },
  { name: "AOD-9604", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [52.5, 49.0, 45.5], bulkWholesale: [42.0, 36.0, 32.5, 27.0, 24.0] },
  { name: "AOD-9604", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [50.0, 48.5, 47.0], bulkWholesale: [45.5, 44.5, 43.0, 41.5, 40.0] },
  { name: "CJC-1295 W DAC", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [71.0, 66.5, 62.0], bulkWholesale: [57.0, 49.5, 42.5, 36.0, 30.0] },
  { name: "CJC-1295 W DAC", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [112.5, 105.0, 97.5], bulkWholesale: [90.0, 80.0, 70.0, 61.0, 52.0] },
  { name: "CJC-1295", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [41.0, 38.5, 36.0], bulkWholesale: [33.0, 27.5, 25.0, 22.5, 18.0] },
  { name: "CJC-1295", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [67.5, 63.0, 58.5], bulkWholesale: [54.0, 47.0, 40.0, 34.0, 28.0] },
  { name: "Epithalon", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [22.5, 21.0, 19.5], bulkWholesale: [18.0, 16.5, 15.0, 13.5, 12.0] },
  { name: "Epithalon", size: "50mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [62.0, 58.5, 54.5], bulkWholesale: [51.0, 47.0, 43.5, 39.5, 36.0] },
  { name: "GHK-Cu", size: "50mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [22.5, 21.0, 19.5], bulkWholesale: [18.0, 14.0, 12.5, 11.0, 10.0] },
  { name: "GHK-Cu", size: "100mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [30.0, 27.5, 25.5], bulkWholesale: [23.0, 21.0, 18.5, 16.5, 14.0] },
  { name: "Melanotan-II", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [30.0, 28.0, 26.0], bulkWholesale: [24.0, 19.0, 17.5, 16.0, 12.0] },
  { name: "FOXO4-DRI", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [187.5, 175.0, 162.5], bulkWholesale: [150.0, 132.0, 115.0, 99.0, 84.0] },
  { name: "KPV", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [30.0, 28.0, 26.0], bulkWholesale: [24.0, 19.0, 17.5, 16.0, 14.0] },
  { name: "VIP", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [34.0, 31.5, 29.0], bulkWholesale: [27.0, 22.0, 20.0, 16.0, 14.0] },
  { name: "VIP", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [60.0, 56.0, 52.0], bulkWholesale: [48.0, 41.0, 35.0, 29.0, 24.0] },
  { name: "P-21", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [90.0, 84.0, 78.0], bulkWholesale: [72.0, 63.0, 55.0, 47.0, 42.0] },
  { name: "GHRP-2", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [22.5, 21.0, 19.5], bulkWholesale: [18.0, 16.5, 15.0, 13.5, 12.0] },
  { name: "GHRP-2", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [30.0, 28.0, 26.0], bulkWholesale: [24.0, 19.0, 17.5, 16.0, 14.0] },
  { name: "GHRP-6", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [22.5, 21.0, 19.5], bulkWholesale: [18.0, 16.5, 15.0, 13.5, 12.0] },
  { name: "GHRP-6", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [30.0, 28.0, 26.0], bulkWholesale: [24.0, 19.0, 17.5, 16.0, 14.0] },
  { name: "SNAP-8", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [22.5, 21.0, 19.5], bulkWholesale: [18.0, 16.5, 15.0, 13.5, 12.0] },
  { name: "MOTS-C", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [26.0, 24.5, 23.0], bulkWholesale: [21.0, 19.0, 17.5, 16.0, 14.0] },
  { name: "MOTS-C", size: "20mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [67.5, 63.0, 58.5], bulkWholesale: [54.0, 47.0, 40.0, 34.0, 28.0] },
  { name: "IGF-1 LR3", size: "1mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [95.0, 88.0, 80.5], bulkWholesale: [73.5, 66.5, 59.5, 52.0, 45.0] },
  { name: "Cagrilinitide", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [52.5, 49.0, 45.5], bulkWholesale: [42.0, 36.0, 30.0, 25.0, 20.0] },
  { name: "Cagrilinitide", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [90.0, 84.0, 78.0], bulkWholesale: [72.0, 63.0, 55.0, 47.0, 40.0] },
  { name: "Dihexa", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [19.0, 17.5, 16.0], bulkWholesale: [15.0, 14.0, 12.5, 11.0, 10.0] },
  { name: "Dihexa", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [26.0, 24.5, 23.0], bulkWholesale: [21.0, 19.0, 17.5, 16.0, 12.0] },
  { name: "Oxytocin", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [30.0, 28.0, 26.0], bulkWholesale: [24.0, 19.0, 17.5, 16.0, 14.0] },
  { name: "PT-141", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [26.0, 24.5, 23.0], bulkWholesale: [21.0, 19.0, 17.5, 16.0, 14.0] },
  { name: "DSIP", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [24.0, 22.5, 21.0], bulkWholesale: [19.5, 18.5, 17.0, 15.5, 14.0] },
  { name: "Thymosin Alpha-1", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [48.0, 45.0, 42.5], bulkWholesale: [39.5, 36.5, 33.5, 31.0, 28.0] },
  { name: "Gonadorelin", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [41.0, 38.5, 36.0], bulkWholesale: [33.0, 27.5, 22.5, 20.0, 16.0] },
  { name: "Semax", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [26.0, 24.5, 23.0], bulkWholesale: [21.0, 19.0, 17.5, 16.0, 12.0] },
  { name: "Semax", size: "30mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [56.0, 52.5, 49.0], bulkWholesale: [45.0, 38.5, 32.5, 29.0, 24.0] },
  { name: "Selank", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [26.0, 24.5, 23.0], bulkWholesale: [21.0, 19.0, 17.5, 16.0, 12.0] },
  { name: "Semax Acetyl", size: "30mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [64.0, 59.5, 55.0], bulkWholesale: [51.0, 44.0, 37.5, 34.0, 28.0] },
  { name: "Selank Acetyl", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [34.0, 31.5, 29.0], bulkWholesale: [27.0, 25.0, 22.5, 20.0, 16.0] },
  { name: "NAD+", size: "500mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [37.5, 35.0, 32.5], bulkWholesale: [30.0, 27.5, 25.0, 22.5, 20.0] },
  { name: "NAD+", size: "1000mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [67.5, 63.0, 58.5], bulkWholesale: [54.0, 49.5, 45.0, 40.5, 36.0] },
  { name: "Sermorelin", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [34.0, 31.5, 29.0], bulkWholesale: [27.0, 22.0, 17.5, 16.0, 14.0] },
  { name: "Sermorelin", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [54.0, 50.5, 47.0], bulkWholesale: [43.5, 40.0, 36.5, 33.0, 29.5] },
  { name: "Kisspeptin-10", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [37.5, 35.0, 32.5], bulkWholesale: [30.0, 25.0, 22.5, 18.0, 16.0] },
  { name: "LL-37", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [56.0, 52.5, 49.0], bulkWholesale: [45.0, 38.5, 32.5, 29.0, 24.0] },
  { name: "ARA-290", size: "16mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [49.0, 45.5, 42.0], bulkWholesale: [39.0, 36.0, 32.5, 29.0, 26.0] },
  { name: "SS-31", size: "10mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [34.0, 31.5, 29.0], bulkWholesale: [27.0, 25.0, 22.5, 20.0, 18.0] },
  { name: "SS-31", size: "30mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [105.0, 98.0, 91.0], bulkWholesale: [84.0, 71.5, 65.0, 56.0, 48.0] },
  { name: "SS-31", size: "50mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [135.0, 128.5, 121.5], bulkWholesale: [115.0, 108.0, 101.5, 94.5, 88.0] },
  { name: "HGH Frag 176-191", size: "5mg", category: "INJECTABLE_PEPTIDE", bulkRetail: [56.0, 52.5, 49.0], bulkWholesale: [45.0, 38.5, 32.5, 29.0, 24.0] },
];

// ---------------------------------------------------------------------------
// GLP / METABOLIC
// ---------------------------------------------------------------------------
export const GLP: BulkCatalogItem[] = [
  { name: "Semaglutide", size: "5mg", category: "INJECTABLE_GLP", bulkRetail: [45.0, 43.0, 40.5], bulkWholesale: [38.5, 36.5, 34.5, 32.0, 30.0] },
  { name: "Semaglutide", size: "10mg", category: "INJECTABLE_GLP", bulkRetail: [55.0, 53.0, 50.5], bulkWholesale: [48.5, 46.5, 44.5, 42.0, 40.0] },
  { name: "Semaglutide", size: "15mg", category: "INJECTABLE_GLP", bulkRetail: [75.0, 72.0, 69.5], bulkWholesale: [66.5, 63.5, 60.5, 58.0, 55.0] },
  { name: "Semaglutide", size: "20mg", category: "INJECTABLE_GLP", bulkRetail: [90.0, 86.5, 83.0], bulkWholesale: [79.5, 75.5, 72.0, 68.5, 65.0] },
  { name: "Tirzepatide", size: "10mg", category: "INJECTABLE_GLP", bulkRetail: [48.0, 46.5, 44.5], bulkWholesale: [43.0, 41.0, 39.5, 37.5, 36.0] },
  { name: "Tirzepatide", size: "15mg", category: "INJECTABLE_GLP", bulkRetail: [58.0, 56.0, 54.5], bulkWholesale: [52.5, 50.5, 48.5, 47.0, 45.0] },
  { name: "Tirzepatide", size: "20mg", category: "INJECTABLE_GLP", bulkRetail: [74.0, 70.5, 67.5], bulkWholesale: [64.0, 61.0, 57.5, 54.5, 51.0] },
  { name: "Tirzepatide", size: "30mg", category: "INJECTABLE_GLP", bulkRetail: [80.0, 78.5, 76.5], bulkWholesale: [75.0, 73.0, 71.5, 69.5, 68.0] },
  { name: "Tirzepatide", size: "40mg", category: "INJECTABLE_GLP", bulkRetail: [90.0, 88.5, 86.5], bulkWholesale: [85.0, 83.0, 81.5, 79.5, 78.0] },
  { name: "Retatrutide", size: "10mg", category: "INJECTABLE_GLP", bulkRetail: [55.0, 53.0, 50.5], bulkWholesale: [48.5, 46.5, 44.5, 42.0, 40.0] },
  { name: "Retatrutide", size: "20mg", category: "INJECTABLE_GLP", bulkRetail: [90.0, 88.0, 85.5], bulkWholesale: [83.5, 81.5, 79.5, 77.0, 75.0] },
  { name: "Retatrutide", size: "30mg", category: "INJECTABLE_GLP", bulkRetail: [120.0, 115.5, 111.5], bulkWholesale: [107.0, 103.0, 98.5, 94.5, 90.0] },
  { name: "Retatrutide", size: "40mg", category: "INJECTABLE_GLP", bulkRetail: [120.0, 112.0, 104.0], bulkWholesale: [96.0, 82.5, 70.0, 61.0, 50.0] },
  { name: "Tesamorelin", size: "5mg", category: "INJECTABLE_GLP", bulkRetail: [37.5, 35.0, 32.5], bulkWholesale: [30.0, 27.5, 22.5, 18.0, 16.0] },
  { name: "Tesamorelin", size: "10mg", category: "INJECTABLE_GLP", bulkRetail: [60.0, 56.0, 52.0], bulkWholesale: [48.0, 44.0, 40.0, 36.0, 32.0] },
  { name: "Tesamorelin", size: "20mg", category: "INJECTABLE_GLP", bulkRetail: [135.0, 126.0, 117.0], bulkWholesale: [108.0, 93.5, 85.0, 72.0, 64.0] },
];

// ---------------------------------------------------------------------------
// BIO REGULATORS — all 20mg, uniformly priced across the 16 SKUs at every tier
// ---------------------------------------------------------------------------
const BIOREGULATOR_NAMES = [
  "Pinealon", "Ovagen", "Chonluten", "Prostamax", "Cortagen", "Vesugen", "Thymalin",
  "Cardiogen", "Testagen", "Vilon", "Cartalax", "Crystagen", "Pancragen", "Vesilute",
  "Livagen", "Bronchogen",
];
const BIOREGULATOR_RETAIL: [number, number, number] = [37.5, 35.0, 32.5];
const BIOREGULATOR_WHOLESALE: [number, number, number, number, number] = [30.0, 25.0, 20.0, 18.0, 14.0];

export const BIOREGULATORS: BulkCatalogItem[] = BIOREGULATOR_NAMES.map((name) => ({
  name,
  size: "20mg",
  category: "INJECTABLE_BIOREGULATOR",
  bulkRetail: BIOREGULATOR_RETAIL,
  bulkWholesale: BIOREGULATOR_WHOLESALE,
}));

// ---------------------------------------------------------------------------
// PEPTIDE BLENDS
// ---------------------------------------------------------------------------
export const BLENDS: BulkCatalogItem[] = [
  { name: "BPC-TB", size: "5/5mg", category: "INJECTABLE_BLEND", bulkRetail: [30.0, 30.0, 30.0], bulkWholesale: [30.0, 28.0, 28.0, 26.0, 24.0] },
  { name: "BPC-TB", size: "10/10mg", category: "INJECTABLE_BLEND", bulkRetail: [34.0, 34.0, 34.0], bulkWholesale: [34.0, 34.0, 34.0, 34.0, 34.0] },
  { name: "BPC-TB", size: "20/20mg", category: "INJECTABLE_BLEND", bulkRetail: [68.0, 68.0, 68.0], bulkWholesale: [68.0, 68.0, 68.0, 68.0, 68.0] },
  { name: "KLOW", size: "50/10mg", category: "INJECTABLE_BLEND", bulkRetail: [42.0, 42.0, 42.0], bulkWholesale: [42.0, 40.0, 38.0, 38.0, 38.0] },
  { name: "KLOW", size: "80mg", category: "INJECTABLE_BLEND", bulkRetail: [42.0, 42.0, 42.0], bulkWholesale: [42.0, 42.0, 42.0, 42.0, 42.0] },
  { name: "KLOW", size: "100/20mg", category: "INJECTABLE_BLEND", bulkRetail: [80.0, 80.0, 80.0], bulkWholesale: [80.0, 78.0, 74.0, 74.0, 72.0] },
  { name: "GLOW", size: "50/10/10mg", category: "INJECTABLE_BLEND", bulkRetail: [34.0, 34.0, 34.0], bulkWholesale: [34.0, 32.0, 32.0, 30.0, 30.0] },
  { name: "GLOW", size: "100/20/20mg", category: "INJECTABLE_BLEND", bulkRetail: [72.0, 70.0, 68.0], bulkWholesale: [66.0, 64.0, 62.0, 60.0, 58.0] },
  { name: "Ipa/CJC", size: "5/5mg", category: "INJECTABLE_BLEND", bulkRetail: [26.0, 26.0, 26.0], bulkWholesale: [26.0, 24.0, 22.0, 22.0, 20.0] },
  { name: "Ipa/CJC", size: "10/10mg", category: "INJECTABLE_BLEND", bulkRetail: [54.0, 50.0, 45.5], bulkWholesale: [41.5, 37.5, 33.5, 29.0, 25.0] },
  { name: "Tesa/Ipa", size: "10/5mg", category: "INJECTABLE_BLEND", bulkRetail: [50.0, 50.0, 50.0], bulkWholesale: [50.0, 46.0, 42.0, 40.0, 38.0] },
  { name: "Semax/Selank", size: "30/10mg", category: "INJECTABLE_BLEND", bulkRetail: [36.0, 36.0, 36.0], bulkWholesale: [36.0, 34.0, 34.0, 32.0, 32.0] },
  { name: "AOD/Tesa", size: "5/5mg", category: "INJECTABLE_BLEND", bulkRetail: [44.0, 44.0, 44.0], bulkWholesale: [44.0, 42.0, 40.0, 40.0, 40.0] },
];

export const FULL_BULK_CATALOG: BulkCatalogItem[] = [...PEPTIDES, ...GLP, ...BIOREGULATORS, ...BLENDS];

// ---------------------------------------------------------------------------
// WHOLESALE SPRAYS
// ---------------------------------------------------------------------------
export const SPRAYS: SprayCreamCatalogItem[] = [
  { name: "BPC-157 Spray", category: "NASAL_SPRAY", prices: [35.0, 32.5, 30.0] },
  { name: "Dihexa Spray", category: "NASAL_SPRAY", prices: [35.0, 32.5, 30.0] },
  { name: "MT-2 Spray", category: "NASAL_SPRAY", prices: [35.0, 32.5, 30.0] },
  { name: "NAD+ Spray", category: "NASAL_SPRAY", prices: [35.0, 32.5, 30.0] },
  { name: "PT-141 Spray", category: "NASAL_SPRAY", prices: [35.0, 32.5, 30.0] },
  { name: "PT-141 / Oxytocin Spray", category: "NASAL_SPRAY", prices: [43.0, 40.5, 38.0] },
  { name: "Selank Spray", category: "NASAL_SPRAY", prices: [33.0, 30.5, 28.0] },
  { name: "Semax Spray", category: "NASAL_SPRAY", prices: [33.0, 30.5, 28.0] },
  { name: "Semax / Selank / Dihexa Spray", category: "NASAL_SPRAY", prices: [43.0, 40.5, 38.0] },
  { name: "TB-500 Spray", category: "NASAL_SPRAY", prices: [35.0, 32.5, 30.0] },
];

// ---------------------------------------------------------------------------
// WHOLESALE TOPICAL CREAMS
// ---------------------------------------------------------------------------
export const CREAMS: SprayCreamCatalogItem[] = [
  { name: "Repair Cream", category: "TOPICAL_CREAM", description: "BPC-157 + TB-500", prices: [45.0, 42.5, 40.0] },
  { name: "Smooth Cream", category: "TOPICAL_CREAM", description: "GHK-Cu + SNAP-8 + KPV", prices: [49.0, 46.5, 44.0] },
  { name: "Tan Cream", category: "TOPICAL_CREAM", description: "Melanotan-2 + GHK-Cu", prices: [45.0, 42.5, 40.0] },
];

export const SPRAY_CREAM_TERMS = {
  minUnitsPerSku: 50,
  depositPercent: 50,
  fulfillmentBusinessDays: { min: 7, max: 10 },
  finalSale: true,
  disclaimer: "All products are for research purposes only and not for human consumption.",
} as const;

export const SOURCE_DISCLAIMER =
  "All prices in USD per unit. For research purposes only. Products not for human consumption.";
