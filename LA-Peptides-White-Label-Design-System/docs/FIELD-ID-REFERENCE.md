# Field ID Reference

Every value that changes per brand/product/batch is a **field**. Fields are matched by a dotted `fieldKey` to a specific element `id` inside `src/master-label.svg`, as registered in `spec/label-spec.json` → `"fields"`. This is the whole integration surface: a future app only needs to know these keys and IDs, never the SVG's internal markup.

| fieldKey | SVG element id | Applied as | Required | Notes |
|---|---|---|---|---|
| `branding.logo.primary` | `branding-logo-primary` | `href` / `xlink:href` on an `<image>` | yes | Relative path to a logo asset (svg/png). Icon-only mark — the brand *name* is separate text, not baked into the logo file. |
| `branding.name` | `branding-name` | text content | yes | Max 28 chars. |
| `branding.tagline` | `branding-tagline` | text content | no | Max 42 chars — fixed-width column, does not auto-shrink. |
| `branding.defaultClaim` | `branding-default-claim` | text content | no | Overrides the theme's `defaultClaims[0]` for this specific label. Max 90 chars. |
| `product.name` | `product-name` | text content | yes | Max 14 chars — fixed-width column, does not auto-shrink. |
| `product.strength` | `product-strength` | text content | yes | Max 16 chars, e.g. `"10MG"`. |
| `tracking.qr.destination` | `tracking-qr` | QR-encoded into `href`/`xlink:href` on an `<image>` | yes | A URL — typically a COA lookup page. The build script generates the QR bitmap; you never hand-draw it. |
| `tracking.lotValue` | `tracking-lot-value` | text content | yes | Max 20 chars. |
| `tracking.ubdValue` | `tracking-ubd-value` | text content | yes | Max 12 chars, e.g. `"06/2026"`. |

## Writing a field-map file

A field-map is a flat JSON object using exactly these keys (validated by `spec/schema/field-map.schema.json`):

```json
{
  "branding.logo.primary": "assets/logos/client-logo.svg",
  "branding.name": "EXAMPLE BRAND CO",
  "branding.tagline": "QUALITY YOU CAN TRUST.",
  "product.name": "EXAMPLE PEPTIDE",
  "product.strength": "10MG",
  "tracking.qr.destination": "https://example.com/coa/EX010125",
  "tracking.lotValue": "EX010125",
  "tracking.ubdValue": "06/2026"
}
```

See `field-maps/white-label-example-alt.field-map.json` for this exact example, ready to build.

## Adding a new field in the future

1. Add an element with a stable `id` to `src/master-label.svg`.
2. Register it in `spec/label-spec.json` → `"elements"` and `"fields"` (fieldKey, elementId, applyAs, required, maxLength).
3. Add the key to `spec/schema/field-map.schema.json`.
4. Document it in this file.

No changes to `scripts/build.js` are needed for a plain `text` or `attr:href` field — the build script is driven entirely by the registry in `label-spec.json`.
