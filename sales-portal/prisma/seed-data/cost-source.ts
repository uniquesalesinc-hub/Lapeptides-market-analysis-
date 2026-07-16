/**
 * HARD COSTS (COGS) — LA Peptides internal cost sheets, provided by JJ 7/15/2026.
 *
 * ADMIN-ONLY DATA. These are the company's buy prices. They must never be queried by,
 * serialized to, or rendered for SALES_REP sessions — every read path sits behind
 * requireAdmin().
 *
 * Transcribed VERBATIM from the four cost-sheet pages provided. Bands mirror the Bulk
 * Wholesale sell sheets: <100 / 100–299 / 300–499 / 500–999 / 1000+ units.
 * Values are [c1, c2, c3, c4, c5] in that band order, USD per unit.
 *
 * Name reconciliation against the sell-sheet catalog (documented, not silent):
 *  - "IGF-1 LR3 <95%"  → catalog "IGF-1 LR3" (the <95% purity qualifier is cost-sheet only)
 *  - "FOX04-DRI"        → catalog "FOXO4-DRI" (cost sheet typo: zero for the letter O)
 *  - "KLOW 50/10/-mg"   → catalog KLOW "50/10mg"; "100/20/-mg" → "100/20mg"
 *  - "MOTS-c"           → catalog "MOTS-C" (case only; SKUs match)
 *
 * NO COST DATA PROVIDED for (flagged to JJ; these SKUs show "no cost on file"):
 *  - NAD+ 500/1000mg, KLOW 80mg, and all sprays, creams, and capsules.
 * (GLP-section costs arrived 7/15 evening and are included below.)
 */

/** [name (catalog spelling), size, c1, c2, c3, c4, c5] */
export type CostRow = [string, string, number, number, number, number, number];

export const COST_BANDS = [
  { tier: 1, minQty: 1, maxQty: 99 as number | null },
  { tier: 2, minQty: 100, maxQty: 299 as number | null },
  { tier: 3, minQty: 300, maxQty: 499 as number | null },
  { tier: 4, minQty: 500, maxQty: 999 as number | null },
  { tier: 5, minQty: 1000, maxQty: null as number | null },
];

export const COSTS: CostRow[] = [
  // ── PEPTIDES ──────────────────────────────────────────────────────────────
  ["BPC-157", "5mg", 7, 6, 6, 6, 6],
  ["BPC-157", "10mg", 10, 8, 7, 7, 6.5],
  ["BPC-157", "15mg", 13, 11.5, 11, 10.5, 9],
  ["BPC-157", "20mg", 16, 14, 13, 12, 10],
  ["TB-500", "5mg", 10, 9, 9, 8, 8],
  ["TB-500", "10mg", 16, 14, 14, 13, 13],
  ["Ipamorelin", "5mg", 6, 6, 6, 6, 6],
  ["Ipamorelin", "10mg", 8, 8, 8, 8, 7],
  ["AOD-9604", "5mg", 14, 13, 13, 12, 12],
  ["AOD-9604", "10mg", 24, 23, 22, 21, 20],
  ["CJC-1295 W DAC", "5mg", 19, 18, 17, 16, 15],
  ["CJC-1295 W DAC", "10mg", 30, 29, 28, 27, 26],
  ["CJC-1295", "5mg", 11, 10, 10, 10, 9],
  ["CJC-1295", "10mg", 18, 17, 16, 15, 14],
  ["Epithalon", "10mg", 6, 6, 6, 6, 6],
  ["Epithalon", "50mg", 20, 20, 20, 19, 18],
  ["GHK-Cu", "50mg", 6, 5, 5, 5, 5],
  ["GHK-Cu", "100mg", 9, 8, 8, 8, 7],
  ["Melanotan-II", "10mg", 8, 7, 7, 7, 6],
  ["FOXO4-DRI", "10mg", 50, 48, 46, 44, 42], // cost sheet prints "FOX04-DRI"
  ["KPV", "10mg", 8, 7, 7, 7, 7],
  ["VIP", "5mg", 9, 8, 8, 7, 7],
  ["VIP", "10mg", 16, 15, 14, 13, 12],
  ["P-21", "5mg", 24, 23, 22, 21, 21],
  ["GHRP-2", "5mg", 6, 6, 6, 6, 6],
  ["GHRP-2", "10mg", 8, 7, 7, 7, 7],
  ["GHRP-6", "5mg", 6, 6, 6, 6, 6],
  ["GHRP-6", "10mg", 8, 7, 7, 7, 7],
  ["SNAP-8", "10mg", 7, 6, 6, 6, 6],
  ["MOTS-C", "10mg", 10, 9, 9, 8, 7], // cost sheet prints "MOTS-c"
  ["MOTS-C", "20mg", 18, 17, 16, 15, 14],
  ["IGF-1 LR3", "1mg", 19, 18, 17, 16, 15], // cost sheet prints "IGF-1 LR3 <95%"
  ["Cagrilinitide", "5mg", 14, 13, 12, 11, 10],
  ["Cagrilinitide", "10mg", 24, 23, 22, 21, 20],
  ["Dihexa", "5mg", 5, 5, 5, 5, 5],
  ["Dihexa", "10mg", 7, 7, 7, 7, 6],
  ["Oxytocin", "10mg", 8, 7, 7, 7, 7],
  ["PT-141", "10mg", 9, 8, 7, 7, 7],
  ["DSIP", "5mg", 7, 6, 6, 6, 6],
  ["Thymosin Alpha-1", "10mg", 17, 16, 15, 15, 14],
  ["Gonadorelin", "10mg", 11, 10, 9, 9, 8],
  ["Semax", "10mg", 7, 7, 7, 7, 6],
  ["Semax", "30mg", 15, 14, 13, 13, 12],
  ["Selank", "10mg", 7, 7, 7, 7, 6],
  ["Semax Acetyl", "30mg", 17, 16, 15, 15, 14],
  ["Selank Acetyl", "10mg", 9, 9, 9, 9, 8],
  // ── GLP (cost page provided 7/15 evening) ─────────────────────────────────
  ["Semaglutide", "5mg", 7, 6, 6, 6, 6],
  ["Semaglutide", "10mg", 11, 10, 9, 9, 8],
  ["Semaglutide", "15mg", 15, 14, 13, 13, 12],
  ["Semaglutide", "20mg", 19, 18, 17, 17, 16],
  ["Tirzepatide", "10mg", 12, 11, 10, 9, 8],
  ["Tirzepatide", "15mg", 16, 15, 14, 13, 12],
  ["Tirzepatide", "20mg", 20, 19, 18, 17, 16],
  ["Tirzepatide", "30mg", 27, 25, 23, 21, 20],
  ["Tirzepatide", "40mg", 32, 30, 28, 27, 25],
  ["Retatrutide", "10mg", 12, 11, 10, 9, 8],
  ["Retatrutide", "20mg", 20, 19, 18, 17, 16],
  ["Retatrutide", "30mg", 27, 25, 23, 21, 20],
  ["Retatrutide", "40mg", 32, 30, 28, 27, 25],
  ["Tesamorelin", "5mg", 10, 10, 9, 8, 8],
  ["Tesamorelin", "10mg", 19, 18, 18, 17, 17],
  ["Tesamorelin", "20mg", 36, 34, 34, 32, 32],
  ["Sermorelin", "5mg", 9, 8, 7, 7, 7],
  ["Sermorelin", "10mg", 16, 14, 13, 13, 13],
  ["Kisspeptin-10", "10mg", 10, 9, 9, 8, 8],
  ["LL-37", "5mg", 15, 14, 13, 13, 12],
  ["ARA-290", "16mg", 15, 14, 13, 13, 12],
  ["SS-31", "10mg", 12, 11, 10, 10, 9],
  ["SS-31", "30mg", 28, 26, 26, 25, 24],
  ["SS-31", "50mg", 44, 40, 39, 37, 35],
  ["HGH Frag 176-191", "5mg", 15, 14, 13, 13, 12],
  // ── BIO REGULATORS (uniform 10/9/8/8/7) ──────────────────────────────────
  ...([
    "Pinealon", "Ovagen", "Chonluten", "Prostamax", "Cortagen", "Vesugen",
    "Thymalin", "Cardiogen", "Testagen", "Vilon", "Cartalax", "Crystagen",
    "Pancragen", "Vesilute", "Livagen", "Bronchogen",
  ].map((n): CostRow => [n, "20mg", 10, 9, 8, 8, 7])),
  // ── PEPTIDE BLENDS ────────────────────────────────────────────────────────
  ["BPC-TB", "5/5mg", 15, 14, 14, 13, 12],
  ["BPC-TB", "10/10mg", 24, 20, 20, 18, 17],
  ["BPC-TB", "20/20mg", 42, 38, 37, 36, 34],
  ["KLOW", "50/10mg", 21, 20, 19, 19, 19], // cost sheet prints "50/10/-mg"
  ["KLOW", "100/20mg", 40, 39, 37, 37, 36], // cost sheet prints "100/20/-mg"
  ["GLOW", "50/10/10mg", 17, 16, 16, 15, 15],
  ["GLOW", "100/20/20mg", 33, 31, 31, 29, 29],
  ["Ipa/CJC", "5/5mg", 13, 12, 11, 11, 10],
  ["Ipa/CJC", "10/10mg", 25, 23, 20, 20, 19],
  ["Tesa/Ipa", "10/5mg", 25, 23, 21, 20, 19],
  ["Semax/Selank", "30/10mg", 18, 17, 17, 16, 16],
  ["AOD/Tesa", "5/5mg", 22, 21, 20, 20, 20],
];
