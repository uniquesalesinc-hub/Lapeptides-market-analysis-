# LA Peptides Universal Label Template

**v1.1.0** — a portable, brand-neutral vial-label template, reusable across many different brand partners. This is a template package only: no app, website, database, login system, or ordering portal. It is independent of the sales app, website, pricing tools, and market-analysis work elsewhere in this repository — no shared files or dependencies.

**No real or fictional brand identity is represented anywhere in this package.** A set of reference photos of an existing printed label were used only to study layout structure (a three-section landscape design with divider lines, a QR/lot/UBD verification block, and small-caps micro-type) — every visual region from that reference was rebuilt from scratch as an independently editable object using neutral placeholder content (`YOUR LOGO`, `BRAND NAME`, `PEPTIDE NAME`, `00MG`, `LOT000000`, `MM/YYYY`, etc.). None of that reference's name, logo, tagline, colors, QR code, or lot number appear here.

**Start here:** `manifest.json` is the single entry point — it lists every file in this package, every editable region/field id, and what's required vs. optional, so a consuming system can discover the whole package from one file.

## Physical spec

| | |
|---|---|
| Size | 1.77in × 0.77in (44.958mm × 19.558mm) |
| PDF page size | 127.44pt × 55.44pt |
| Raster | 531 × 231px at 300dpi |
| Orientation | Landscape |
| Margins | None |
| Crop marks | None |
| Coordinate system | 1 SVG user unit = 1pt — `master-label.svg`'s viewBox (`0 0 127.44 55.44`) maps directly onto the PDF page with zero unit conversion |

Print at **100% / Actual Size** — see the printing note at the bottom of this file.

## Layer / panel structure

```
MASTER LABEL
├── Background Layer      background_fill, border_frame
├── Left Branding Panel   brand_logo, brand_logo_secondary, brand_name, brand_subtitle, brand_tagline, brand_decorative_graphic
├── Divider Layer         divider_1, divider_2
├── Product Panel         product_name, product_strength, product_descriptor, product_concentration, product_vial_size, purity_icon, purity_claim, lab_icon, lab_claim
├── Verification Panel    country_icon, coa_qr, qr_caption, lot_label, lot_number, ubd_label, ubd, coa_url
└── Theme Layer           colors, fonts, logo, icons, border, background, dividers, QR style — see default-theme.json (no coordinates; see "Theme tokens" below)
```

Every id above is an independently editable SVG object — background, border (color/thickness/radius), both divider lines, every logo/icon/graphic, every text field, the QR, LOT, UBD, and both claims. Nothing is flattened or grouped in a way that blocks editing one piece without affecting another; layer order/positioning follow normal SVG document order, editable in Illustrator/Figma/Inkscape exactly as you'd expect.

**The same id is used in three places, always identically**: as the element's `id` in `master-label.svg`, as the `fieldKey`/`elementId` pair in `label-spec.json` → `fields`, and as the region `id` in `layout.json` → `regions`. One flat, snake_case identifier per editable thing — that's the whole integration contract.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | **Start here.** Package-level table of contents — every file, every region/field id, what's required. |
| `master-label.svg` | **Canonical source.** The template structure — open and edit directly in Illustrator/Figma/Inkscape/a browser. |
| `label-spec.json` | **Canonical source.** Physical geometry + the field/theme registry mapping ids to elements — the machine-readable contract a future app reads. |
| `layout.json` | **Canonical source.** Percentage-based `x`/`y`/`width`/`height` for every editable region, so a renderer at any resolution can position an overlay/editor without parsing the SVG. |
| `default-theme.json` | **Canonical source.** The neutral starter palette (colors/fonts/logo/border). |
| `example-brand-theme.json` | **Canonical source.** A second, distinct palette proving the template reskins cleanly — still fully generic content. |
| `placeholder-logo.svg` | Swappable default logo asset (visually reads "replace me"). |
| `placeholder-qr.svg` | Swappable default QR-look graphic (not a real/scannable code). |
| `placeholder-icons.svg` | Standalone reference copy of the icon set (purity, lab-tested, origin, secondary logo, decorative accent). |
| `master-label-preview.png` | Committed 300dpi preview, default theme, all placeholders. |
| `master-label-print.pdf` | Committed exact-size vector print PDF, default theme, all placeholders. |
| `master-label-editable.pdf` | Same vector content as the print PDF, meant for reopening/editing in Acrobat/Illustrator. |
| `schema/*.json` | JSON Schemas for validating `label-spec.json`, `layout.json`, a theme, a field-map, or `manifest.json` (optional, not required to use the template). |
| `scripts/` | Reusable Node build pipeline (see below) — optional tooling, not required to just look at or hand-edit the SVG/PDF/PNG. |

The SVG and JSON files are the source of truth. `master-label-preview.png`, `master-label-print.pdf`, and `master-label-editable.pdf` are reproducible from them at any time via `npm run build:master`.

## Icon set note

`master-label.svg` embeds its own copy of every icon (`<symbol>` defs in `<defs>`, referenced via same-document `<use href="#icon-...">`) rather than pulling from `placeholder-icons.svg` via a cross-file reference. This is intentional: cross-file SVG `<use>` resolution is unreliable across renderers and PDF tooling (see the note in `scripts/lib/applyFields.js`), so the master file stays self-contained and renders identically everywhere. The `<symbol>` ids (`icon-purity`, `icon-lab-tested`, etc.) are internal drawing primitives, not editable-region ids — the `<use>` elements that reference them (`purity_icon`, `lab_icon`, `country_icon`, `brand_logo_secondary`, `brand_decorative_graphic`) are the editable regions. `placeholder-icons.svg` is kept as a standalone, matching reference copy — if you redesign an icon, update both.

## layout.json — percentage coordinates

Every region in `layout.json` gives `x`/`y`/`width`/`height` as a percentage of the canvas (0–100), plus `panel` (which layer it belongs to) and `type`. Text regions add `baselineYPct` (the SVG baseline, if you need to render real `<text>`) and `textAnchor` (`"start"` or `"middle"`).

**Important**: because the canvas itself is not square (127.44 × 55.44pt), a square element's `width`% and `height`% are not equal by design — e.g. `coa_qr` is 18×18pt but reports `width: 14.124, height: 32.468`. Render the canvas at its true aspect ratio (any size proportional to 127.44:55.44, e.g. 531×231px) and convert each axis back independently (`widthPx = width/100 * canvasWidthPx`, `heightPx = height/100 * canvasHeightPx`) — that reproduces the exact square. Don't derive one scale factor from width and apply it to height.

Text region boxes are the **allotted** space a field is safe to fill (matching its `maxLength` in `label-spec.json`), not the as-drawn bounding box of the current placeholder string.

## Theme tokens

| Token | Styles |
|---|---|
| `colors.background` | Label background |
| `colors.primary` | Border, `brand_name`, `product_name`, `product_strength`, `lot_number`, `ubd` |
| `colors.secondary` | `brand_subtitle`, `product_descriptor`, `product_concentration`, `product_vial_size`, `purity_claim`, `lab_claim`, `qr_caption`, `lot_label`, `ubd_label`, `coa_url` |
| `colors.accent` | Both divider lines, `brand_decorative_graphic`, `brand_tagline` |
| `colors.darkAccent` | `brand_logo_secondary`, `purity_icon`, `lab_icon`, `country_icon` |
| `fonts.brandFont` / `fonts.bodyFont` / `fonts.monoFont` | `brand_name`/`product_name` headings, body text, LOT/UBD/tracking mono block |
| `logo.primary` | Fallback logo path when a field-map doesn't set `brand_logo` |
| `border.thickness` / `border.radius` | Border stroke width / corner radius (pt) |

Full detail (which element id each token maps to) is in `label-spec.json` → `themeTargets`.

## Field keys

Every brand/product/tracking value is a field, keyed by the same flat id used everywhere else (see `label-spec.json` → `fields`), e.g.:

```json
{
  "brand_logo": "assets/logos/client-logo.svg",
  "brand_name": "BRAND NAME",
  "brand_subtitle": "BRAND SUBTITLE",
  "brand_tagline": "BRAND TAGLINE",
  "product_name": "PEPTIDE NAME",
  "product_strength": "00MG",
  "product_concentration": "0MG/ML",
  "product_vial_size": "0ML VIAL",
  "coa_qr": "https://example.com/coa/LOT000000",
  "lot_number": "LOT000000",
  "ubd": "MM/YYYY",
  "coa_url": "coa.example.com/LOT000000"
}
```

`brand_logo`, `brand_name`, `product_name`, `product_strength`, `coa_qr`, `lot_number`, and `ubd` are required; everything else is optional and falls back to the master's neutral placeholder. A field-map is optional entirely — omit it to build with every placeholder untouched (this is how the committed `master-label-*` deliverables are produced). See `manifest.json` → `requiredContentFieldIds` for the machine-readable version of this list.

## Build tooling (optional)

```bash
npm install
npm run build:master          # regenerates master-label-preview.png / -print.pdf / -editable.pdf
node scripts/build.js --theme example-brand-theme.json --out .build/example-brand --zip
node scripts/build.js --theme default-theme.json --fields path/to/your-brand.field-map.json --out .build/your-brand --zip
```

Each build: applies the theme, optionally applies a field-map (generating a real, scannable QR code from `coa_qr` if present), writes a portable `label.svg` (relative asset paths, every referenced asset copied alongside it), renders a 300dpi PNG and an exact-size vector PDF, verifies the PDF's page dimensions against `label-spec.json`, and writes a per-build `manifest.json` into the output directory recording exactly what produced that build (this is a different file from the package-level `manifest.json` at the repo root — the root one describes the whole package; the one inside a build's output directory describes just that one build's provenance). Pass `--zip` to package the output folder for hand-off.

This tooling is supplementary — the required deliverable is the flat file set above, which any team (web, backend, production, or a future application) can consume directly from `label-spec.json` and `layout.json` without running any of this code.

## Printing on an Epson ColorWorks C6000Au

- Load die-cut/continuous label media matching 1.77in × 0.77in.
- Print at **100% / Actual Size** — never "Fit to page." `master-label-print.pdf`'s page is already the exact physical size; scaling it would misalign it against die-cut media.
- Let the driver manage color (sRGB in, printer profile handles the rest) unless a specific ICC profile has been provided for your media.
- No margins/bleed/crop marks are needed for a single die-cut label — this template ships without them by design.

## Portability guarantees

- No dependencies on private local file paths — every path in every source file is relative to the package root.
- No references to proprietary or expiring cloud URLs — QR/COA URLs in this package use `https://example.com/...` / `coa.example.com/...` placeholders; replace with real destinations per brand partner.
- `npm install` only pulls public npm packages — required solely for the optional build tooling, not for opening/editing the SVG/PDF/PNG.
- The whole folder is a self-contained, zippable package: email it, upload it to Drive/Dropbox, hand it to a contractor or brand partner, open it in Illustrator/Acrobat/Figma/Canva, store it in git, or wire `label-spec.json`/`layout.json`/`manifest.json` into a future website/app/automated PDF pipeline — all without editing this package itself.

## Upgrading from v1.0.0

v1.1.0 renamed every element id and field key to the flat snake_case scheme described above (e.g. `branding.name` → `brand_name`, `tracking.qr.destination` → `coa_qr`). Field-map files written against v1.0.0 need their keys updated — see `schema/field-map.schema.json` for the current full list. See `CHANGELOG.md` for the complete diff.
