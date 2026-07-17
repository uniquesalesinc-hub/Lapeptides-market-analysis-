# Changelog

All notable changes to this template package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/).

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
