# LA Peptides Universal Label Template

**v1.0.0** — a portable, brand-neutral vial-label template, reusable across many different brand partners. This is a template package only: no app, website, database, login system, or ordering portal. It is independent of the sales app, website, pricing tools, and market-analysis work elsewhere in this repository — no shared files or dependencies.

**No real or fictional brand identity is represented anywhere in this package.** A set of reference photos of an existing printed label were used only to study layout structure (a three-section landscape design with divider lines, a QR/lot/UBD verification block, and small-caps micro-type) — every visual region from that reference was rebuilt from scratch as an independently editable object using neutral placeholder content (`YOUR LOGO`, `BRAND NAME`, `PEPTIDE NAME`, `00MG`, `LOT000000`, `MM/YYYY`, etc.). None of that reference's name, logo, tagline, colors, QR code, or lot number appear here.

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

## Layout

Three sections, left to right, separated by two vertical divider lines:

**BRANDING** (x 0–42) — primary logo placeholder, optional secondary logo/certification badge, brand name, brand subtitle, brand tagline, optional decorative accent graphic.

**PRODUCT** (x 42–88) — peptide name, product descriptor, strength, concentration, vial size, purity icon + claim, lab-tested icon + claim.

**VERIFICATION** (x 88–127.44) — country/region-of-origin graphic, QR code, QR caption, LOT label + value, UBD label + value, printed COA URL.

Every one of the above — plus the background, border (color/thickness/radius), and the two divider lines — is an independently editable SVG object with a stable `id`. Nothing is flattened or grouped in a way that would block editing one piece without affecting another; layer order/positioning follow normal SVG document order, editable in Illustrator/Figma/Inkscape exactly as you'd expect.

## Files

| File | Purpose |
|---|---|
| `master-label.svg` | **Canonical source.** The template structure — open and edit directly in Illustrator/Figma/Inkscape/a browser. |
| `label-spec.json` | **Canonical source.** Physical geometry + the field/theme registry mapping dotted keys to element ids — the machine-readable contract a future app reads. |
| `default-theme.json` | **Canonical source.** The neutral starter palette (colors/fonts/logo/border). |
| `example-brand-theme.json` | **Canonical source.** A second, distinct palette proving the template reskins cleanly — still fully generic content. |
| `placeholder-logo.svg` | Swappable default logo asset (visually reads "replace me"). |
| `placeholder-qr.svg` | Swappable default QR-look graphic (not a real/scannable code). |
| `placeholder-icons.svg` | Standalone reference copy of the icon set (purity, lab-tested, origin, secondary logo, decorative accent). |
| `master-label-preview.png` | Committed 300dpi preview, default theme, all placeholders. |
| `master-label-print.pdf` | Committed exact-size vector print PDF, default theme, all placeholders. |
| `master-label-editable.pdf` | Same vector content as the print PDF, meant for reopening/editing in Acrobat/Illustrator. |
| `schema/*.json` | Supplementary JSON Schemas for validating a custom theme or field-map (optional, not required to use the template). |
| `scripts/` | Reusable Node build pipeline (see below) — optional tooling, not required to just look at or hand-edit the SVG/PDF/PNG. |

The SVG and JSON files are the source of truth. `master-label-preview.png`, `master-label-print.pdf`, and `master-label-editable.pdf` are reproducible from them at any time via `npm run build:master`.

## Icon set note

`master-label.svg` embeds its own copy of every icon (`<symbol>` defs in `<defs>`, referenced via same-document `<use href="#icon-...">`) rather than pulling from `placeholder-icons.svg` via a cross-file reference. This is intentional: cross-file SVG `<use>` resolution is unreliable across renderers and PDF tooling (see `docs` note in `scripts/lib/applyFields.js`), so the master file stays self-contained and renders identically everywhere. `placeholder-icons.svg` is kept as a standalone, matching reference copy — if you redesign an icon, update both.

## Theme tokens

| Token | Styles |
|---|---|
| `colors.background` | Label background |
| `colors.primary` | Border, brand name, product name, strength, LOT/UBD values |
| `colors.secondary` | Subtitle, descriptor, concentration, vial size, purity/lab-tested claims, QR caption, LOT/UBD labels, COA URL |
| `colors.accent` | Divider lines, decorative accent graphic, tagline |
| `colors.darkAccent` | Secondary logo badge, purity icon, lab-tested icon, origin graphic |
| `fonts.brandFont` / `fonts.bodyFont` / `fonts.monoFont` | Brand/product headings, body text, LOT/UBD/tracking mono block |
| `logo.primary` | Fallback logo path when a field-map doesn't set `branding.logo.primary` |
| `border.thickness` / `border.radius` | Border stroke width / corner radius (pt) |

Full detail (which element id each token maps to) is in `label-spec.json` → `themeTargets`.

## Field keys

Every brand/product/tracking value is a dotted `fieldKey` mapped to a specific element id in `label-spec.json` → `fields`, e.g.:

```json
{
  "branding.logo.primary": "assets/logos/client-logo.svg",
  "branding.name": "BRAND NAME",
  "branding.subtitle": "BRAND SUBTITLE",
  "branding.tagline": "BRAND TAGLINE",
  "product.name": "PEPTIDE NAME",
  "product.strength": "00MG",
  "product.concentration": "0MG/ML",
  "product.vialSize": "0ML VIAL",
  "tracking.qr.destination": "https://example.com/coa/LOT000000",
  "tracking.lotValue": "LOT000000",
  "tracking.ubdValue": "MM/YYYY",
  "tracking.coaUrl": "coa.example.com/LOT000000"
}
```

A field-map is optional — omit it to build with the master's neutral placeholders untouched (this is how the committed `master-label-*` deliverables are produced).

## Build tooling (optional)

```bash
npm install
npm run build:master          # regenerates master-label-preview.png / -print.pdf / -editable.pdf
node scripts/build.js --theme example-brand-theme.json --out .build/example-brand --zip
node scripts/build.js --theme default-theme.json --fields path/to/your-brand.field-map.json --out .build/your-brand --zip
```

Each build: applies the theme, optionally applies a field-map (generating a real, scannable QR code from `tracking.qr.destination` if present), writes a portable `label.svg` (relative asset paths, every referenced asset copied alongside it), renders a 300dpi PNG and an exact-size vector PDF, verifies the PDF's page dimensions against `label-spec.json`, and writes a `manifest.json` recording exactly what produced the build. Pass `--zip` to package the output folder for hand-off.

This tooling is supplementary — the required deliverable is the flat file set above, which any team (web, backend, production, or a future application) can consume directly from `label-spec.json` without running any of this code.

## Printing on an Epson ColorWorks C6000Au

- Load die-cut/continuous label media matching 1.77in × 0.77in.
- Print at **100% / Actual Size** — never "Fit to page." `master-label-print.pdf`'s page is already the exact physical size; scaling it would misalign it against die-cut media.
- Let the driver manage color (sRGB in, printer profile handles the rest) unless a specific ICC profile has been provided for your media.
- No margins/bleed/crop marks are needed for a single die-cut label — this template ships without them by design.

## Portability guarantees

- No dependencies on private local file paths — every path in every source file is relative to the package root.
- No references to proprietary or expiring cloud URLs — QR/COA URLs in this package use `https://example.com/...` / `coa.example.com/...` placeholders; replace with real destinations per brand partner.
- `npm install` only pulls public npm packages — required solely for the optional build tooling, not for opening/editing the SVG/PDF/PNG.
- The whole folder is a self-contained, zippable package: email it, upload it to Drive/Dropbox, hand it to a contractor or brand partner, open it in Illustrator/Acrobat/Figma/Canva, store it in git, or wire `label-spec.json` into a future website/app/automated PDF pipeline — all without editing this package itself.
