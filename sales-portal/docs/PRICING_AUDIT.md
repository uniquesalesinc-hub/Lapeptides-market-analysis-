# LA Peptides — Wholesale Pricing Audit

This document is the required first step of the Sales Portal build: a full audit of every
uploaded wholesale pricing sheet, before any schema or application code was written. All
prices, tiers, minimums, and SKU names below are transcribed verbatim from the source PDFs.
**Nothing in this document or in the application's pricing data was invented, estimated, or
adjusted.**

## 1. Files reviewed

| # | File | Program | Tiers | Minimum basis | Dated |
|---|---|---|---|---|---|
| 1 | `BulkRetail_Tier1.pdf` | Bulk Retail | Tier 1 | 20+ bottles per SKU | May 2026 |
| 2 | `BulkRetail_Tier2.pdf` | Bulk Retail | Tier 2 | 50+ bottles per SKU | May 2026 |
| 3 | `BulkRetail_Tier3.pdf` | Bulk Retail | Tier 3 | 75+ bottles per SKU | May 2026 |
| 4 | `BulkWholesale_Tier1.pdf` | Bulk Wholesale | Tier 1 | Less than 100 bottles per SKU | May 2026 |
| 5 | `BulkWholesale_Tier2.pdf` | Bulk Wholesale | Tier 2 | 100–299 bottles per SKU | May 2026 |
| 6 | `BulkWholesale_Tier3.pdf` | Bulk Wholesale | Tier 3 | 300–499 bottles per SKU | May 2026 |
| 7 | `BulkWholesale_Tier4.pdf` | Bulk Wholesale | Tier 4 | 500–999 bottles per SKU | May 2026 |
| 8 | `BulkWholesale_Tier5.pdf` | Bulk Wholesale | Tier 5 | 1,000+ bottles per SKU | May 2026 |
| 9 | `Wholesale_Sprays.pdf` | Wholesale Sprays | 3 tiers (50+ / 100+ / 200+ units) | 50+ units per SKU | May 2026 |
| 10 | `Wholesale_Creams.pdf` | Wholesale Creams | 3 tiers (50+ / 100+ / 200+ units) | 50+ units per SKU | May 2026 |

A separate, previously-reviewed file (`MDlapeptides-market-analysis.md`, already in this repo)
contains LA Peptides' **direct-to-consumer retail** prices (e.g. BPC-157 10mg = $59.99) used
for competitor benchmarking. **That is a different document for a different audience and is
explicitly out of scope for this application.** The Sales Portal only quotes from the four
wholesale programs above (files 1–10). To avoid confusion with that consumer price list, this
app never uses the bare word "retail" without the word "Bulk" in front of it — see §4.

## 2. Structure common to all four programs

Every program covers the same underlying catalog, organized into four categories:

- **Peptides** — single-compound injectables (BPC-157, TB-500, Ipamorelin, CJC-1295, GHK-Cu, etc.)
- **GLP** — metabolic/GLP-1 class injectables (Semaglutide, Tirzepatide, Retatrutide, Tesamorelin)
- **Bio Regulators** — 16 SKUs, all 20mg, all identically priced within a given tier
- **Peptide Blends** — combination products (BPC-TB, KLOW, GLOW, Ipa/CJC, Tesa/Ipa, Semax/Selank, AOD/Tesa)

Bulk Retail and Bulk Wholesale share **identical SKUs, sizes, and category structure** — only
the per-tier unit price and the qualifying bottle-count band differ. Wholesale Sprays and
Wholesale Creams are separate product lines entirely (spray/cream finished formats, not raw
injectable vials) with their own simpler 3-tier structure and their own terms & conditions
(50% deposit, 7–10 business day fulfillment, final-sale) that do not appear anywhere in the
Bulk Retail / Bulk Wholesale sheets.

All ten sheets carry the same footer disclaimer, preserved verbatim in the app:
*"All prices in USD per unit. For research purposes only. Products not for human consumption."*

## 3. What was extracted per sheet

For every SKU on every sheet: item name, size/strength, and wholesale unit price. For the
spray/cream sheets: item name and the three tier prices, plus the terms & conditions block
(minimum order, 50% deposit, balance on delivery, 7–10 business day fulfillment, final sale).
No sheet contains a **total-order minimum** — every minimum found is a **per-SKU** minimum
(a bottle/unit count that must be met *for that SKU* to unlock that tier's price). No sheet
states a blended/combined-SKU minimum. This is preserved exactly — the app does not invent a
total-order minimum that isn't in the source material (see §5, item 5).

The full normalized price list (all SKUs × all 8 bulk tiers + both 3-tier spray/cream lists)
is implemented as typed seed data in
[`sales-portal/prisma/seed-data/pricing-source.ts`](../prisma/seed-data/pricing-source.ts),
which is the machine-readable counterpart to this document and the actual source the
application loads at seed time. Every number in that file traces back to one of the ten PDFs
listed in §1 — cross-check against `MDlapeptides-wholesale-bulk-analysis.md` at the repo root,
which was produced from the same source read and lays out every SKU across all 8 tiers in
table form.

## 4. Conflicts and open questions found — **flagged, not resolved**

Per instruction, pricing tiers/sheets are **not** combined or silently reconciled. The
following were found and require a business decision from an LA Peptides administrator before
go-live. The application models them as-is (two independent, separately-selectable price
lists) rather than guessing which one should win.

1. **Bulk Retail and Bulk Wholesale bands overlap, with different prices, for the same order
   size.** Bulk Retail Tier 3 applies at 75+ bottles/SKU. Bulk Wholesale Tier 1 applies at
   "less than 100" bottles/SKU — which also covers 75–99 bottles. At that overlap, the two
   sheets disagree: e.g. BPC-157 10mg is **$32.50** under Bulk Retail Tier 3 (75+) but
   **$30.00** under Bulk Wholesale Tier 1 (<100) — a cheaper price for what reads as a
   *smaller* qualifying threshold. The sheets do not state which program takes precedence, or
   whether they're meant for different customer types (e.g. "Bulk Retail" for resellers vs.
   "Bulk Wholesale" for distributors) that would never both apply to the same account. **The
   app does not auto-select the cheaper (or either) tier.** Instead, each customer account (or
   each quote) is explicitly assigned a Price List (Bulk Retail or Bulk Wholesale — see the
   Customer model), and only that program's tiers are used for that quote. An administrator
   must decide, per customer/account type, which program applies. This must be resolved by LA
   Peptides before reps start quoting against both programs interchangeably.

2. **TB-500 10mg price inversion at the Bulk Retail → Bulk Wholesale boundary.** Bulk Retail
   Tier 3 (75+) prices TB-500 10mg at $35.00 — *cheaper* than Bulk Wholesale Tier 1 (<100) at
   $37.50. Every other SKU decreases monotonically moving from Bulk Retail Tier 1 down through
   Bulk Wholesale Tier 5; this is the one exception. Left as-is in the seed data (not
   "corrected" to fit the pattern) — flagged for the pricing-sheet owner to confirm intent.

3. **Four blend SKUs carry a flat price across all 8 tiers with zero volume discount**:
   BPC-TB 10/10mg ($34.00 everywhere), KLOW 80mg ($42.00 everywhere), Semax/Selank 30/10mg
   ($36.00 everywhere), AOD/Tesa 5/5mg ($44.00 everywhere). This may be intentional
   (margin-protected top sellers) or a sheet oversight. Implemented as given — the pricing
   engine does not add a discount that isn't present in the source.

4. **Retatrutide 40mg and Tesamorelin 20mg discount far more steeply than their neighboring
   sizes** (roughly 2–2.5× the rate of every other GLP SKU). Possibly intentional inventory
   management, possibly a copy error from an adjacent row in the source spreadsheet. Preserved
   as-is; flagged for confirmation.

5. **No total-order minimum appears anywhere in the ten sheets** — only per-SKU minimums. The
   task brief asks the app to "enforce total-order minimums" where that information exists in
   the source; since it does not exist, the app's order-minimum check is **per-SKU only** by
   default, with a configurable (but currently unset) total-order-minimum field left available
   in Company Settings for an administrator to turn on later if LA Peptides adopts one.

6. **Bio Regulators are uniformly priced except Thymalin has a different consumer retail price
   in the (out-of-scope) competitor doc** ($69.99 vs. $59.99 for its 15 siblings) but is priced
   **identically** to the other 15 Bio Regulator SKUs in all 8 wholesale tiers here. No
   conflict within the wholesale sheets themselves — noted only because it could look like an
   inconsistency if someone cross-references the two documents.

None of the six items above were resolved by assumption. They are represented faithfully in
the seed data and surfaced in the Admin Pricing screen as data-integrity notes so an
administrator sees them before publishing pricing to reps.

## 5. Minimum-order rules implemented

- **Per-SKU minimum**: every line item's quantity must meet or exceed the minimum bottle/unit
  count for the tier being quoted (20/50/75 for Bulk Retail; the wholesale tiers are open
  bands — e.g. "500–999" — so the *floor* of the band, 500, is the enforced minimum to enter
  Tier 4). Falling short does not downgrade silently: the UI shows the shortfall and the next
  cheaper tier that *would* apply at the entered quantity.
- **Total-order minimum**: not present in any source sheet (see §4.5) — left configurable and
  off by default.
- **Sprays/Creams minimum**: 50 units per SKU minimum to enter Tier 1 at all; below 50 units,
  no wholesale price exists in the source and the app blocks finalizing that line rather than
  guessing a unit price.

## 6. Special pricing exceptions / notes carried into the app verbatim

- Sprays and creams require a **50% deposit** to confirm an order and carry a **7–10 business
  day fulfillment** window; **all sales are final** on those two product lines. These terms
  are shown in the quote/invoice UI whenever a spray or cream line item is present, and are
  not applied to peptide/GLP/bioregulator/blend line items (those sheets carry no such terms).
- All ten sheets: "For research purposes only. Products not for human consumption." This
  disclaimer is rendered on every quote PDF, invoice PDF, and the customer-facing approval
  page, and the product catalog UI cannot present copy that contradicts it (see Compliance
  section of the main README).

## 7. Categories mapped to the application's Product Category enum

| Source category | App category |
|---|---|
| Peptides | `INJECTABLE_PEPTIDE` |
| GLP | `INJECTABLE_GLP` |
| Bio Regulators | `INJECTABLE_BIOREGULATOR` |
| Peptide Blends | `INJECTABLE_BLEND` |
| Wholesale Sprays | `NASAL_SPRAY` |
| Wholesale Creams | `TOPICAL_CREAM` |

No capsule products exist in the ten uploaded wholesale sheets (capsules only appear in the
unrelated, out-of-scope consumer retail comparison doc). The catalog schema still supports a
`CAPSULE` category for forward-compatibility, but no capsule SKUs are seeded, since none has
been supplied with real wholesale pricing — per the "no placeholder pricing" rule.
