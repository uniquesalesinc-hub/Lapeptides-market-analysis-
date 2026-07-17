# Production Guide (Non-Technical)

For anyone reviewing, approving, or printing a finished label — no coding required.

## What's in a finished label build

Every label comes from combining two simple things:

1. **The brand** — logo, colors, fonts, tagline. Set up once per brand partner, reused for every product they sell.
2. **The product** — peptide name, strength, lot number, use-by date, QR link. Set up fresh for every new batch.

A build folder (e.g. `.build/acme-tesamorelin-10mg/`) always contains:

| File | What it is |
|---|---|
| `label-preview.png` | A full-resolution image of exactly what will print |
| `label-print.pdf` | The exact-size file to send to the printer |
| `label.svg` | The editable source (for the design/web team, not needed for review) |
| `manifest.json` | A record of exactly which brand and product data produced this build |

## Reviewing a finished label

Open `label-preview.png`. Check:

- [ ] Brand name, logo, and colors are correct for this partner
- [ ] Peptide name and strength are correct and legible
- [ ] Lot number and use-by date (UBD) are correct — cross-check against the actual batch paperwork
- [ ] The QR code caption reads as expected (usually "SCAN FOR COA")
- [ ] Purity and lab-tested claims match this batch's actual test results
- [ ] Nothing is cut off, overlapping, or spilling past the printed border
- [ ] If the brand name, tagline, or peptide name is unusually long, double-check it didn't shrink to an awkwardly small size — see "Text overflow" in `VALIDATION-RULES.md`

Then open `label-print.pdf` in Adobe Acrobat or Preview and confirm:

- [ ] Page size reads exactly **1.77 × 0.77 inches** (Acrobat: File → Properties → Description → Page Size)
- [ ] Text and the QR code are sharp at 100% zoom, not blurry

## Printing on the Epson ColorWorks C6000

1. Load label media matching **1.77in × 0.77in**.
2. Print dialog: **Scale = 100% / Actual Size** — never "Fit to page." The PDF is already the exact size; scaling it misaligns it against die-cut media.
3. Let the printer driver manage color unless a specific color profile has been provided for this media.
4. No margins, bleed, or crop marks are needed — this format is a single pre-sized label; the print is the trim.
5. After printing, compare one printed label against `label-preview.png` at 100% — check color, sharpness of small text, and **scan the QR code with a phone** to confirm it resolves to the right COA page.

## Requesting a change

Tell whoever maintains this system which of the two inputs needs to change:

- "The **colors/logo/font/tagline** are wrong" → a brand-profile change (affects every future batch for this partner)
- "The **peptide name/strength/lot/date/QR link** is wrong" → a product-profile change (affects only this one batch)

That distinction gets the right fix without back-and-forth.

## Reprinting a batch later

Every build's `manifest.json` records the exact brand-profile and product-profile files (and template version) that produced it. Keep it alongside the printed batch — a reprint months later should be rebuilt from those same recorded files, not re-derived by eye from an old printed sample.

## Version history

Check `CHANGELOG.md` before reprinting an old batch against a newer copy of this system — it lists what changed between versions and whether it affects previously printed labels.
