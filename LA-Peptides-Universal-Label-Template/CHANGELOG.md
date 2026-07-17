# Changelog

All notable changes to this template package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-07-17

### Added

- `layout.json`: percentage-based `x`/`y`/`width`/`height` (plus `baselineYPct`/`textAnchor` for text) for every one of the 27 editable regions in `master-label.svg`, organized by layer/panel (Background, Divider, Brand, Product, Verification) matching the requested structure. Percentages are computed against the canvas's two independent axes (width% of 127.44pt, height% of 55.44pt) — documented explicitly so a consumer doesn't naively apply one axis's scale factor to the other and distort square elements like `coa_qr`.
- `manifest.json`: a single package-level entry point listing every canonical source, derived deliverable, placeholder asset, schema, and doc, plus the full `editableRegionIds` / `contentFieldIds` / `requiredContentFieldIds` lists — everything a web app, the sales app, or a backend tool needs to discover before touching any other file.
- `schema/layout.schema.json` and `schema/manifest.schema.json`, alongside the existing label-spec/theme/field-map schemas.

### Changed (breaking)

- **Every element id and field key was renamed to a flat, snake_case scheme** so one identifier is used identically as the SVG element id, the `label-spec.json` fieldKey/elementId, and the `layout.json` region id — e.g. `branding-name` → `brand_name`, `tracking-qr` → `coa_qr`, `tracking-lot-value` → `lot_number`, `verification-origin-graphic` → `country_icon`, `icon-purity-use` → `purity_icon`. Field-map files written against v1.0.0's dotted keys (`branding.name`, `tracking.qr.destination`, etc.) must be updated to the new flat keys — see `README.md` and `schema/field-map.schema.json` for the full current list.
- `qr_caption` is now a regular content field (settable per field-map) rather than a theme-only override; `scripts/lib/applyTheme.js` no longer special-cases QR caption text.
- `scripts/lib/applyTheme.js`'s brand-font application now reads its target element ids from `label-spec.json` → `fontTargets.brandFontElementIds` instead of a hardcoded list.

## [1.0.0] — 2026-07-17

### Added

- Canonical source `master-label.svg`: a brand-neutral, three-section (branding / product / verification) vial-label template at exactly 1.77in × 0.77in (44.958mm × 19.558mm, 127.44pt × 55.44pt, 531×231px @300dpi), landscape, no margins, no crop marks. Every value is a neutral placeholder (`YOUR LOGO`, `BRAND NAME`, `PEPTIDE NAME`, `00MG`, `LOT000000`, `MM/YYYY`, etc.) — no real or fictional brand identity.
- `label-spec.json`: physical geometry plus the field/theme registry mapping dotted field-map keys and theme tokens to stable element ids, so every object (background, border, border thickness/radius, divider lines, logos, graphics, icons, text, colors, QR, LOT, UBD, claims) is independently identifiable and editable by a future application.
- `default-theme.json` (the requested neutral starter palette: background `#F7F4EC`, primary `#1B3A4B`, secondary `#20A0B0`, accent `#D4AF37`, dark accent `#B8862A`) and `example-brand-theme.json` (a second, distinct palette proving the reskin works) — both render the identical neutral placeholder content, just restyled.
- `placeholder-logo.svg`, `placeholder-qr.svg`, `placeholder-icons.svg`: swappable, generic default assets. The logo placeholder visually reads "replace me"; the QR placeholder is a non-scannable stand-in graphic (a real, scannable QR is generated automatically by the build script whenever a `tracking.qr.destination` value is supplied); the icon sprite documents the purity/lab-tested/origin/secondary-logo/decorative icon set (duplicated inline in `master-label.svg`'s `<defs>` for renderer compatibility — see README.md).
- `schema/` (label-spec, theme, field-map JSON Schemas) — supplementary validation aids, not part of the required file list but included for teams that want to validate a custom theme or field-map before building.
- `scripts/build.js` + `scripts/lib/*`: reusable Node build pipeline — applies a theme (and, optionally, a field-map) to the canonical SVG, generates a live QR code from `tracking.qr.destination` when provided, produces a 300dpi PNG preview and an exact-physical-size vector PDF, and verifies the PDF's page dimensions against `label-spec.json`. `scripts/build-master.js` runs this with `default-theme.json` and no field-map to produce this package's own committed master deliverables.
- Committed master deliverables: `master-label-preview.png`, `master-label-print.pdf`, `master-label-editable.pdf` — all-placeholder content, default theme applied, dimension-verified.
- `README.md`, `CHANGELOG.md`, `VERSION`.

### Notes

- This is a template package only — no app, website, database, login system, or ordering portal is included or intended.
- The uploaded reference photos used during design were treated as structural reference only; no element of their branding (name, logo, tagline, colors, QR, lot number) was carried into this template.
