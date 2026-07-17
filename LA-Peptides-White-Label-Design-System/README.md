# LA Peptides White-Label Design System

**v1.0.0** — a portable, theme-driven vial-label template system. This project is completely independent from the sales app, website, pricing tools, and market-analysis work elsewhere in this repository — it does not modify, import from, or depend on any of them.

## What this is

A canonical, editable label design (`src/master-label.svg`) plus a machine-readable spec (`spec/label-spec.json`) that lets any brand/product/tracking data be applied by element id, and any brand look (colors/fonts/logo) be applied by theme — without ever touching the SVG's structure. A Node build script turns "canonical SVG + theme + field values" into a PNG preview, an exact-size print PDF, and a self-contained, zippable deliverable folder.

Built to be handed off: emailed, uploaded to Drive/Dropbox, sent to a contractor or brand partner, opened in Illustrator/Acrobat/Figma, stored in git, or wired into a future website/app/PDF pipeline — all without editing this package.

## Canonical source of truth

1. `src/master-label.svg` — the label's structure and default placeholder content.
2. `spec/label-spec.json` — physical size, bleed/safe area, and the field/theme registry mapping dotted keys to SVG element ids.
3. `themes/*.theme.json` — brand styling (colors, fonts, logo, QR caption, default legal claim).
4. `assets/` + `assets/fonts/font-manifest.json` — every asset the canonical SVG can reference, and the font stack it expects.

**Every other deliverable (PNG, PDF, a specific brand's `label.svg`) is reproducible from these four inputs via `scripts/build.js`.** Nothing else is hand-maintained.

## Directory layout

```
LA-Peptides-White-Label-Design-System/
├── VERSION                      semantic version of the template
├── CHANGELOG.md
├── README.md                    (this file)
├── package.json
├── src/
│   └── master-label.svg         canonical label source
├── spec/
│   ├── label-spec.json          canonical field/theme/geometry registry
│   └── schema/                  JSON Schemas for label-spec / theme / field-map
├── themes/                      brand styling files
├── field-maps/                  per-label content files
├── assets/
│   ├── logos/                   icon-only brand marks
│   ├── qr/                      generated QR output lands here per build
│   └── fonts/font-manifest.json font licensing/fallback documentation
├── scripts/
│   ├── build.js                 CLI: SVG + theme + fields → PNG/PDF/zip
│   └── lib/                     applyTheme, applyFields, generatePng/Pdf, verifyPdf, packageZip
├── docs/                        quick-start, production, dev, field/theme reference, Epson printing
├── examples/output/              (reserved for committed sample renders, if desired)
└── dist/                        build output (gitignored — regenerate with npm run build:*)
```

## Requirements

- Node.js 18+
- `npm install` (pulls `qrcode`, `sharp`, `pdfkit`, `svg-to-pdfkit`, `pdf-lib`, `archiver`, `@xmldom/xmldom`, `xpath` — all plain npm packages, no native local paths, no expiring cloud URLs)

## Build

```bash
npm install
npm run build:default    # LA Peptides house brand + BPC-157 5MG example
npm run build:example      # generic alternate-palette white-label example
```

Or directly, for a custom theme/field-map:

```bash
node scripts/build.js --theme themes/your-brand.theme.json --fields field-maps/your-product.field-map.json --out dist/your-build --zip
```

Each build performs, in order:

1. Load `src/master-label.svg` and apply the theme (colors/fonts/logo/QR caption) per `label-spec.json`'s `themeTargets`.
2. Apply the field-map's values by element id per `label-spec.json`'s `fields` registry — including generating the QR code image from `tracking.qr.destination` — copying every referenced asset into the output directory.
3. Write the portable, editable `label.svg` (relative paths only).
4. Produce a render-only variant (images inlined as base64 data URIs — see the note below) and generate:
   - `label-preview.png` at the spec's target DPI (300dpi, 1050×450px for the 3.5×1.5in label)
   - `label-print.pdf` at the exact physical page size (252×108pt = 3.5×1.5in)
5. Re-open the generated PDF and **verify its page size matches the spec** — the build fails loudly if not.
6. Write `manifest.json` documenting exactly what produced the build (template version, theme id, every applied field value, PDF verification result).
7. Optionally zip the whole output directory (`--zip`).

### Why images are inlined as data URIs for rendering

Modern librsvg (used by `sharp` for PNG rasterization) refuses to resolve local-file `<image>` hrefs at render time — this holds for absolute paths, relative paths, file input, and buffer input alike, and it fails silently rather than erroring. `scripts/lib/applyFields.js`'s `resolveForRender` works around this, and around pdfkit/svg-to-pdfkit's expectations, by inlining every referenced raster image as a `data:image/png;base64,...` URI in an in-memory copy of the SVG used only for PNG/PDF generation. The `label.svg` written to disk keeps ordinary relative asset paths — it stays a normal, editable file.

## Physical spec

- **Size**: 3.5in × 1.5in (a common vial-label footprint)
- **Coordinate system**: 1 SVG user unit = 1pt (72 units/in) — the viewBox (`0 0 252 108`) maps directly onto the PDF page with zero unit conversion
- **Bleed**: 0.0625in all sides
- **Safe area**: 0.09375in inset from the trim edge
- **Color**: authored in sRGB; CMYK conversion is intentionally left to press/RIP time (see `docs/EPSON-PRINTING-INSTRUCTIONS.md`), not baked into the canonical SVG

## Documentation index

| Doc | Audience |
|---|---|
| `docs/QUICK-START.md` | Anyone — one page, build in five minutes |
| `docs/PRODUCTION-GUIDE.md` | Non-technical — reviewing/approving/handing off a finished label |
| `docs/DEVELOPER-INTEGRATION-GUIDE.md` | Engineers wiring this into a website, app, or automated pipeline |
| `docs/FIELD-ID-REFERENCE.md` | Every field key, its target element id, constraints |
| `docs/THEME-TOKEN-REFERENCE.md` | Every theme token, what it styles, how to make a new theme |
| `docs/EPSON-PRINTING-INSTRUCTIONS.md` | Printing `label-print.pdf` on an Epson label/inkjet printer |
| `CHANGELOG.md` | What changed between versions |

## Versioning

Semantic versioning (`VERSION`, `CHANGELOG.md`, and `spec/label-spec.json.templateVersion` are kept in sync). Current release: **v1.0.0**.

## Portability guarantees

- No dependencies on private local file paths — every path in every source file is relative to the package root.
- No references to proprietary/expiring cloud URLs — QR destinations in the example field-maps use `https://example.com/...` placeholders; replace with your real COA URLs.
- `npm install` only pulls public npm packages — no private registries, no vendored binaries checked in.
- A `dist/<name>/` build output (or its `.zip`) is self-contained: open `label.svg` on any machine with the assets folder alongside it, no other part of this repository required.
