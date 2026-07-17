# Quick Start

**What this is:** a portable vial-label template. One canonical SVG + a theme file (colors/fonts/logo) + a field-map file (brand/product/tracking values) = a print-ready label.

## 1. Install (once)

```bash
cd LA-Peptides-White-Label-Design-System
npm install
```

## 2. Build the two included examples

```bash
npm run build:default   # LA Peptides house brand
npm run build:example    # "True North" white-label example
```

Each writes to `dist/<name>/`:

| File | What it's for |
|---|---|
| `label.svg` | Editable source — open in Illustrator/Figma/Inkscape |
| `label-preview.png` | 300dpi raster preview |
| `label-print.pdf` | Exact-size (3.5"×1.5") vector print PDF |
| `manifest.json` | What theme/fields built this, and PDF size verification |
| `assets/` | Every logo/QR asset the SVG references |

## 3. Make your own label

1. Copy `themes/la-peptides-default.theme.json` → `themes/your-brand.theme.json`. Edit colors, fonts, logo path.
2. Copy `field-maps/la-peptides-default.field-map.json` → `field-maps/your-product.field-map.json`. Edit brand name, product, lot, UBD, and the QR destination URL.
3. Put your logo file in `assets/logos/` and point `logo.primary` (theme) / `branding.logo.primary` (field-map) at it.
4. Build:
   ```bash
   node scripts/build.js --theme themes/your-brand.theme.json --fields field-maps/your-product.field-map.json --out dist/your-product --zip
   ```
5. Hand off `dist/your-product.zip` — it's self-contained (relative paths only, all assets included).

## Where to go next

- Not sure what a field or theme key does? → `docs/FIELD-ID-REFERENCE.md` / `docs/THEME-TOKEN-REFERENCE.md`
- Printing on an Epson label printer? → `docs/EPSON-PRINTING-INSTRUCTIONS.md`
- Building this into a website or app? → `docs/DEVELOPER-INTEGRATION-GUIDE.md`
- Full details? → `README.md`
