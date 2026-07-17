# Quick Start

**What this is:** a portable, brand-neutral vial-label design engine. Supply a **brand profile** (logo, colors, fonts) and a **product profile** (peptide name, strength, LOT, UBD) and the engine generates a finished, print-ready label — no redesign, ever.

## 1. Install (once)

```bash
cd LA-Peptides-Universal-Label-System
npm install
```

Requires Node.js 18+. Nothing else — no accounts, no external services, no network access needed to build.

## 2. Build the included examples

```bash
npm run build:master           # the neutral master template itself (all placeholders)
npm run build:profile-example   # a full example brand + product pair, reskinned
```

Each writes to `.build/<name>/`:

| File | What it's for |
|---|---|
| `label.svg` | Editable source — open in Illustrator/Figma/Inkscape/Canva |
| `label-preview.png` | 300dpi raster preview |
| `label-print.pdf` | Exact-size (1.77"×0.77") vector print PDF |
| `manifest.json` | What theme/profile built this, plus PDF-size verification |
| `assets/` | Every logo/QR/icon asset the SVG references |

## 3. Generate a label for a new brand partner

1. Copy `brand-profiles/default.brand-profile.json` → `brand-profiles/your-partner.brand-profile.json`. Set their logo, name, tagline, colors, fonts.
2. Copy `product-profiles/example.product-profile.json` → `product-profiles/your-product.product-profile.json`. Set the peptide name, strength, LOT, UBD, and COA URL.
3. Build, then review `label-preview.png` and hand off `.build/your-product.zip` — it's self-contained:

```bash
node scripts/build-profile.js --brand brand-profiles/your-partner.brand-profile.json --product product-profiles/your-product.product-profile.json --out .build/your-product --zip
```

That's the entire workflow. No part of `master-label.svg` needs to change for a new brand or a new product.

## Where to go next

- Not sure what a field or theme token does? → `FIELD-ID-REFERENCE` is in `DEVELOPER-GUIDE.md`; token map is in `README.md` → "Theme tokens"
- Printing on an Epson ColorWorks? → `DEVELOPER-GUIDE.md` "Export a production-ready PDF"
- Onboarding a new brand partner (non-technical)? → `BRAND-PARTNER-GUIDE.md`
- Reviewing/printing a finished batch (non-technical)? → `PRODUCTION-GUIDE.md`
- Building this into a website, app, or API? → `RENDERING-SPEC.md` and `DEVELOPER-GUIDE.md`
- What gets checked before a build succeeds? → `VALIDATION-RULES.md`
- Full technical detail? → `README.md`
