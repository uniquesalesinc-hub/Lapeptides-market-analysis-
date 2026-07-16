/**
 * SINGLE-UNIT RETAIL PRICES — transcribed VERBATIM from lapeptides.net (LA Peptides'
 * own e-commerce site), fetched 2026-07-16 from the live WooCommerce page source
 * (JSON-LD offers + data-product_variations), not from screenshots or memory.
 *
 * Provenance: JJ, 7/16/2026 — quantities 1-19 price at "the retail price off of
 * Lapeptides"; bulk tiers apply from 20 up; orders below 20 total units cannot
 * check out. This file is the source for the retail band.
 *
 * Rules honored here:
 *  - No price invented, estimated, or rounded. Anything unreadable or ambiguous is
 *    flagged below, never guessed.
 *  - Size attribution: variant products carry the size in their variation data;
 *    single-price products' sizes come from the product page (description / image
 *    naming, e.g. "VIP_10mg_"). Where the portal has exactly one size for the
 *    product, the site price attaches to that SKU.
 *  - GLP masking on the site: "GLP-1 (S)" = Semaglutide, "GLP-2 (T)" = Tirzepatide,
 *    "GLP-3 (R)" = Retatrutide. Other aliases: "LA-31" = SS-31 (slug is /ss-31/),
 *    "Melanotan 2" = Melanotan-II, "BPC/TB500 Blend" = BPC-TB,
 *    "CJC NO DAC/Ipamorelin Blend" = Ipa/CJC, site "Repair/Smooth/Tan" = the creams.
 *
 * KNOWN DISCREPANCY (flagged, excluded): site Thymalin sells a 10mg vial ($69.99);
 * the portal's Thymalin SKU is 20mg. Different size = not attached. See UNMATCHED.
 * WebFetch initially reported an AOD-9604 5MG variant; the raw page source shows
 * only 10MG — the raw source wins, 5mg stays a gap.
 */

/** [portal product name, portal size, retail price USD] */
export type RetailRow = [name: string, size: string, retailPrice: number];

export const RETAIL_PRICES: RetailRow[] = [
  // ── Injectable peptides ────────────────────────────────────────────────────
  ["BPC-157", "10mg", 59.99],
  ["TB-500", "10mg", 79.99],
  ["Ipamorelin", "10mg", 49.99],
  ["AOD-9604", "10mg", 49.99],
  ["Epithalon", "50mg", 79.99],
  ["GHK-Cu", "100mg", 39.99],
  ["Melanotan-II", "10mg", 44.99],
  ["KPV", "10mg", 59.99],
  ["VIP", "10mg", 59.99],
  ["SNAP-8", "10mg", 34.99],
  ["MOTS-C", "10mg", 69.99],
  ["IGF-1 LR3", "1mg", 59.99],
  ["Cagrilinitide", "10mg", 99.99],
  ["PT-141", "10mg", 69.99],
  ["DSIP", "5mg", 29.99],
  ["Thymosin Alpha-1", "10mg", 59.99],
  ["Semax", "10mg", 39.99],
  ["Selank", "10mg", 39.99],
  ["NAD+", "500mg", 74.99],
  ["NAD+", "1000mg", 119.99],
  ["Sermorelin", "10mg", 69.99],
  ["ARA-290", "16mg", 69.99],
  ["SS-31", "10mg", 49.99],
  ["SS-31", "50mg", 150.0],
  // ── GLP (site-masked names) ────────────────────────────────────────────────
  ["Semaglutide", "5mg", 64.99],
  ["Semaglutide", "10mg", 89.99],
  ["Tirzepatide", "15mg", 99.99],
  ["Tirzepatide", "30mg", 169.99],
  ["Retatrutide", "10mg", 94.99],
  ["Retatrutide", "20mg", 169.99],
  ["Retatrutide", "30mg", 229.99],
  ["Tesamorelin", "10mg", 74.99],
  // ── Bio regulators (site sells 20mg singles at $59.99; Testagen page
  //     confirms 20mg in its description) ──────────────────────────────────────
  ["Cardiogen", "20mg", 59.99],
  ["Cartalax", "20mg", 59.99],
  ["Crystagen", "20mg", 59.99],
  ["Ovagen", "20mg", 59.99],
  ["Pancragen", "20mg", 59.99],
  ["Pinealon", "20mg", 59.99],
  ["Testagen", "20mg", 59.99],
  ["Vesugen", "20mg", 59.99],
  ["Vilon", "20mg", 59.99],
  // ── Blends ─────────────────────────────────────────────────────────────────
  ["BPC-TB", "10/10mg", 69.99],
  ["BPC-TB", "20/20mg", 129.99],
  ["Ipa/CJC", "10/10mg", 74.99],
  ["KLOW", "80mg", 129.99], // site imagery names the 80mg format
  ["GLOW", "50/10/10mg", 89.99], // site imagery "70mg" total = 50+10+10
  // ── Sprays (portal spray SKUs are one size) ────────────────────────────────
  ["BPC-157 Spray", "spray", 59.99],
  ["Dihexa Spray", "spray", 59.99],
  ["MT-2 Spray", "spray", 59.99],
  ["NAD+ Spray", "spray", 64.99],
  ["PT-141 Spray", "spray", 59.99],
  ["PT-141 / Oxytocin Spray", "spray", 69.99],
  ["Selank Spray", "spray", 59.99],
  ["Semax Spray", "spray", 59.99],
  ["Semax / Selank / Dihexa Spray", "spray", 89.99],
  ["TB-500 Spray", "spray", 59.99],
  // ── Creams ─────────────────────────────────────────────────────────────────
  ["Repair Cream", "cream", 149.99],
  ["Smooth Cream", "cream", 169.99],
  ["Tan Cream", "cream", 129.99],
  // ── Capsules ───────────────────────────────────────────────────────────────
  ["5 Amino 1MQ Capsules", "capsules", 124.99],
  ["BPC-157 Capsules", "capsules", 89.99],
  ["Dihexa Capsules", "capsules", 79.99],
  ["GHK-Cu Capsules", "capsules", 79.99],
  ["GLP-1 Capsules", "capsules", 229.99],
  ["GLP-2 Capsules", "capsules", 159.99],
  ["Gut Restore Capsules", "capsules", 139.99],
  ["Repair & Fix Capsules", "capsules", 149.99],
  ["SLU-PP-332 Capsules", "capsules", 79.99],
  ["TB-500 Capsules", "capsules", 89.99],
];

/** Site products with a price but no matching portal SKU (or a size conflict). */
export const RETAIL_UNMATCHED: { siteName: string; detail: string; price: number }[] = [
  { siteName: "Thymalin", detail: "site sells 10mg; portal SKU is 20mg — size conflict, not attached", price: 69.99 },
  { siteName: "5-Amino 1MQ (vial)", detail: "no portal vial SKU", price: 55.99 },
  { siteName: "Acetic Acid", detail: "no portal SKU", price: 14.99 },
  { siteName: "Adamax Spray 10mg", detail: "no portal SKU", price: 99.99 },
  { siteName: "Adamax Spray 40mg", detail: "no portal SKU", price: 189.99 },
  { siteName: "Glutathione", detail: "no portal SKU", price: 59.99 },
  { siteName: "Gut Restore (page 1 listing)", detail: "matched to capsules row above via capsule list", price: 139.99 },
  { siteName: "Methylene Blue", detail: "no portal SKU", price: 64.99 },
  { siteName: "Peptide Cases", detail: "no portal SKU", price: 19.99 },
  { siteName: "Selank / Semax Spray", detail: "no portal spray SKU (portal has Semax/Selank/Dihexa)", price: 79.99 },
  { siteName: "SLU-PP-32 (vial)", detail: "no portal SKU", price: 74.99 },
  { siteName: "Vitamin B12", detail: "no portal SKU", price: 99.99 },
  { siteName: "Oxytocin (vial)", detail: "portal has Oxytocin 10mg but the site sells no standalone oxytocin vial", price: 0 },
];

/**
 * Portal SKUs with NO site retail price (the site does not sell that product or
 * size). These CANNOT be quoted at 1-19 units until JJ supplies a retail price:
 * the retail band simply does not exist for them (MOQ stays 20).
 * Generated by scripts/check-retail.mjs — regenerate after edits.
 */
export const RETAIL_GAPS: string[] = [
  "BPC-157|5mg","BPC-157|15mg","BPC-157|20mg","TB-500|5mg","Ipamorelin|5mg",
  "AOD-9604|5mg","CJC-1295 W DAC|5mg","CJC-1295 W DAC|10mg","CJC-1295|5mg",
  "CJC-1295|10mg","Epithalon|10mg","GHK-Cu|50mg","FOXO4-DRI|10mg","VIP|5mg",
  "P-21|5mg","GHRP-2|5mg","GHRP-2|10mg","GHRP-6|5mg","GHRP-6|10mg","MOTS-C|20mg",
  "Cagrilinitide|5mg","Dihexa|5mg","Dihexa|10mg","Oxytocin|10mg","Gonadorelin|10mg",
  "Semax|30mg","Semax Acetyl|30mg","Selank Acetyl|10mg","Sermorelin|5mg",
  "Kisspeptin-10|10mg","LL-37|5mg","SS-31|30mg","HGH Frag 176-191|5mg",
  "Semaglutide|15mg","Semaglutide|20mg","Tirzepatide|10mg","Tirzepatide|20mg",
  "Tirzepatide|40mg","Retatrutide|40mg","Tesamorelin|5mg","Tesamorelin|20mg",
  "Chonluten|20mg","Prostamax|20mg","Cortagen|20mg","Thymalin|20mg","Vesilute|20mg",
  "Livagen|20mg","Bronchogen|20mg","BPC-TB|5/5mg","KLOW|50/10mg","KLOW|100/20mg",
  "GLOW|100/20/20mg","Ipa/CJC|5/5mg","Tesa/Ipa|10/5mg","Semax/Selank|30/10mg",
  "AOD/Tesa|5/5mg",
];

/**
 * SUSPECTS — retail at or below the bulk sheet price (verbatim from the site,
 * recorded but flagged for JJ; scripts/check-retail.mjs regenerates this check):
 *  - AOD-9604 10mg: site retail $49.99 vs Bulk Retail T1 $50.00 (one cent under)
 *  - VIP 10mg: site retail $59.99 vs Bulk Retail T1 $60.00 (one cent under)
 *  - IGF-1 LR3 1mg: site retail $59.99 vs Bulk Retail T1 $95.00 — LARGE INVERSION:
 *    a single vial online costs far less than the per-unit bulk sheet price.
 *    [CONFIRM: which price is right before the retail band goes live for this SKU]
 */
