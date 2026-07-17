# Changelog

All notable changes to this template package are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-07-17

### Added

- Canonical source: `src/master-label.svg`, a 3.5"×1.5" vial-label template with stable element ids for every brand/product/tracking field, and `spec/label-spec.json` registering physical geometry, bleed/safe area, and the field/theme mappings.
- JSON Schemas for `label-spec.json`, theme files, and field-map files (`spec/schema/`).
- Theme system separating brand styling (colors, fonts, logo, QR caption, default legal claim) from label structure — `themes/la-peptides-default.theme.json` and a full white-label example, `themes/white-label-example-alt.theme.json`.
- Field-mapping system driven entirely by element ids — `field-maps/la-peptides-default.field-map.json` and `field-maps/white-label-example-alt.field-map.json`.
- Build automation (`scripts/build.js` + `scripts/lib/*`): applies a theme and a field-map to the canonical SVG, generates a live QR code from `tracking.qr.destination`, produces a 300dpi PNG preview and an exact-physical-size vector print PDF, verifies the PDF's page dimensions against the spec, and packages a self-contained, zippable deliverable.
- Full documentation set: quick-start, technical README, non-technical production guide, developer integration guide, field ID reference, theme token reference, Epson printing instructions.
- Semantic versioning scaffolding: this file, `VERSION`, and `spec/label-spec.json.templateVersion`.

### Known limitations

- `qrCaptionStyle.fontSizePt` / `.letterSpacing` / `.uppercase` and `colors.qrCaption` are documented conventions for hand-editing in Illustrator/Figma; they are not yet auto-applied by `scripts/build.js` (only `qrCaptionStyle.text` and `colors.textSecondary` are).
- No embedded font binaries are bundled (by design, to stay license-clean and redistribution-safe) — see `assets/fonts/font-manifest.json` for the recommended open-licensed fonts and fallback stacks.
