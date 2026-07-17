# Theme Token Reference

A theme controls **how the label looks** (colors, fonts, logo, QR caption, default legal claim) without touching the label's structure. Themes are validated against `spec/schema/theme.schema.json`.

## Token reference

| Token | Applies to (element id / attr) | Example |
|---|---|---|
| `colors.background` | `bg-fill` → `fill` | `"#FFFFFF"` |
| `colors.border` | `border-frame` → `stroke` | `"#0B2545"` |
| `colors.brandPrimary` | `branding-name`, `product-name`, `product-strength`, `tracking-lot-value`, `tracking-ubd-value` → `fill` | `"#0B2545"` |
| `colors.brandAccent` | not auto-applied in v1.0.0 — reserved for future accent elements | `"#1E88E5"` |
| `colors.textSecondary` | `branding-tagline`, `tracking-lot-label`, `tracking-ubd-label`, `tracking-qr-caption`, `branding-default-claim` → `fill` | `"#4A4A4A"` |
| `colors.icon` | `icon-primary` → `fill` | `"#0B2545"` |
| `colors.qrCaption` | documented convention; caption color is actually driven by `colors.textSecondary` in v1.0.0 | `"#4A4A4A"` |
| `fonts.brandFont` | `<style id="label-fonts">` (body rule) + direct `font-family` on `branding-name`/`product-name` | `"\"Archivo\", \"Helvetica Neue\", Arial, sans-serif"` |
| `fonts.bodyFont` | `<style id="label-fonts">` `#master-label text` rule | `"\"Inter\", \"Helvetica Neue\", Arial, sans-serif"` |
| `fonts.monoFont` | `<style id="label-fonts">` `.mono` rule (tracking group) | `"\"Roboto Mono\", \"Courier New\", monospace"` |
| `logo.primary` | fallback for `branding.logo.primary` when a field-map doesn't set it | `"assets/logos/la-peptides-logo.svg"` |
| `qrCaptionStyle.text` | `tracking-qr-caption` → text content | `"SCAN FOR COA"` |
| `qrCaptionStyle.fontSizePt` / `.letterSpacing` / `.uppercase` | documented convention for hand-editing in Illustrator/Figma — not auto-applied by `build.js` in v1.0.0 | |
| `defaultClaims[0]` | fallback for `branding.defaultClaim` when a field-map doesn't set it | `"FOR RESEARCH USE ONLY. NOT FOR HUMAN CONSUMPTION."` |

See `spec/label-spec.json` → `"themeTargets"` / `"fontTargets"` for the machine-readable version of this table — that file, not this one, is what `scripts/lib/applyTheme.js` actually reads.

## Included themes

- `themes/la-peptides-default.theme.json` — LA Peptides house brand (navy/blue).
- `themes/white-label-example-alt.theme.json` — example brand-partner theme (forest/gold), demonstrating a full rebrand with zero structural changes.

## Creating a new theme

1. Copy an existing theme file, change `themeId` and `name`.
2. Edit `colors`, `fonts`, `logo.primary` (path to your icon-only mark, relative to the package root).
3. Validate it against `spec/schema/theme.schema.json` (any JSON Schema validator, or just run a build — `scripts/build.js` will throw if a required key is missing).
4. Build: `node scripts/build.js --theme themes/your-theme.json --fields field-maps/your-fields.json --out dist/your-build`.

## Design constraints a theme should respect

- `colors.background` and `colors.brandPrimary` should keep at least a 4.5:1 contrast ratio (label text is small — 4.3–15pt).
- Provide real font-family fallback stacks, not just a brand name — see `assets/fonts/font-manifest.json` for licensing/self-hosting notes on the recommended fonts.
- Logo files referenced by `logo.primary` should be **icon-only** (no baked-in wordmark) — the brand name is a separate text field so it can be recolored/refonted per theme independent of the logo artwork.
