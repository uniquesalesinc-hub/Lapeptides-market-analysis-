# Validation Rules

What this system actually checks before and during a build, implemented in `scripts/lib/validateProfiles.js`, `scripts/lib/autoFit.js`, and `scripts/lib/verifyPdf.js`. Where a rule is a **documented convention** rather than an enforced check, that's stated explicitly — this file does not claim behavior the code doesn't have.

## Required fields

Enforced by `validateProfiles()` (hard error, build aborts) and again by `applyFields()` as a second, independent check:

- **brand-profile.json**: `brandProfileId`, `name`, `logo.primary`, `fonts.heading`, `fonts.body`, `colors.background`, `colors.primary`, `colors.secondary`, `colors.accent`, `colors.border`.
- **product-profile.json**: `productProfileId`, `peptideName`, `strength`, `coaQrDestination`, `lot`, `ubd`.

Every other field is optional and falls back to `master-label.svg`'s neutral placeholder (see `layout.json` → `regions[].defaultPlaceholder` for the exact fallback value of every field).

## Accepted logo/icon/graphic formats

Checked by `checkLogoFormat()` for `logo.primary`, `logo.secondary`, `decorativeGraphic`, `countryGraphic`, `icons.purity`, `icons.labTested`:

- Accepted file extensions: **`.svg`, `.png`, `.jpg`, `.jpeg`**. Anything else is a hard error.
- A value starting with `#` (e.g. `"#icon-purity"`) is treated as a reference to one of `master-label.svg`'s built-in `<symbol>` defs, not a file — skipped by the extension check.
- A value that's an absolute URL (`https://...`) is treated as a remote asset — not extension-checked, not downloaded/copied by the build (left as-is in the output SVG). Prefer a local file for anything that must survive without internet access at print time.
- **SVG is strongly preferred** for logos: it's rasterized on demand at whatever DPI the output needs, so it never pixelates. A raster logo (PNG/JPG) is only ever scaled down cleanly to its allotted box — see "Logo scaling" below — never scaled up.

## Color validation

Checked by `checkHexColor()` for every `brand-profile.colors.*` value: must match `^#[0-9A-Fa-f]{6}$` (6-digit hex, e.g. `#1B3A4B`). 3-digit hex, named colors (`"navy"`), and `rgb()`/`hsl()` are all rejected — this keeps color composition (theme → SVG attribute) unambiguous with no format-normalization step in the pipeline.

## QR validation and generation

- `product-profile.coaQrDestination` is required and is checked with a real `new URL(...)` parse — malformed or relative URLs are a hard error, not a warning.
- At build time, `applyFields()` generates a genuine, scannable QR code PNG (via the `qrcode` library) encoding `coaQrDestination` exactly — the QR is never a static placeholder image in a finished build. Only the **master template's own** committed deliverables (which have no product-profile applied) show the non-scannable placeholder graphic (`placeholder-qr.svg`).
- `coaUrl` (the human-readable text printed near the QR) is independent of the QR's encoded destination — they are never assumed to be the same string, though `coaUrl` defaults to `coaQrDestination` with the scheme stripped if you don't set it explicitly.

## Text overflow

Two different mechanisms, applied to different fields — check `layout.json` → `regions[].autoFit.enabled` to see which applies to a given field:

1. **Auto-fit** (`brand_name`, `product_name`, `brand_tagline`): if the applied text is estimated to be wider than the region's box at its base font-size, the font-size shrinks (down to a hard floor — `minFontSizePt`) so it still fits. This is a **heuristic**, not real glyph measurement: it estimates width as `text.length * fontSize * 0.62`, tuned for the template's bold condensed sans stack at typical letter-spacing. An unusually wide custom heading font, or a string of nearly all wide characters (`"WWWWWWWWWW"`), can still overflow slightly even after shrinking to the floor — **always review `label-preview.png` for any brand/product whose name is unusually long or uses an unusual font**, don't rely on autofit blindly.
2. **Fixed-width warning** (every other text field — `brand_subtitle`, `product_descriptor`, `lot_number`, `coa_url`, etc.): no auto-shrink. If the supplied value is longer than the field's `maxLength` (see `label-spec.json` → `fields[].maxLength`), `validateProfiles()` emits a **warning**, not an error — the build still completes (so a batch isn't blocked by a cosmetic risk), but the console output flags it. Pass `--strict` to `build-profile.js` to make these warnings hard failures instead.

Every `maxLength` in this package is a **tested** number, not a guess — each was verified by actually building a label with a string at that length and visually confirming no overlap (see `CHANGELOG.md` v1.2.0 for a case where an untested `maxLength` was too generous and caused a real overlap, since fixed).

## Logo scaling

`brand_logo`'s `<image>` element has a **fixed box** (its `layout.json` region never changes size) and `preserveAspectRatio="xMinYMid meet"`. This means:

- Any logo you supply — any aspect ratio — is scaled to fit entirely inside the box, preserving its original proportions.
- **Logos are never distorted/stretched.** `meet` (not `slice` or `none`) guarantees this; there is no code path that sets a logo's width/height independently.
- A logo with a very different aspect ratio than the box (e.g. a wide horizontal wordmark) will render smaller than the box in its other dimension (letterboxed), not cropped or warped. Design partner logos as reasonably square/compact icon marks for the best fit — see `BRAND-PARTNER-GUIDE.md`.

## Font fallback

Every font token (`heading`, `subheading`, `body`, `mono`) is expected to be a **full CSS font-family stack**, not a bare name — e.g. `"\"Archivo\", \"Helvetica Neue\", Arial, sans-serif"`, not `"Archivo"`. If the primary font isn't installed on the machine doing the rendering (sharp/librsvg resolve fonts from the local system, same as a browser), the stack's fallback fonts apply automatically. No font binaries are bundled in this package (keeps it license-clean and redistribution-safe) — see `DEVELOPER-GUIDE.md` for recommended open-licensed fonts and how to install them for exact-typography rendering.

## Minimum print sizes

- The physical label is 1.77in × 0.77in. The smallest live text on it (`lot_label`/`ubd_label` at ~2.5pt, `coa_url` at 2pt) is intentionally tiny — this is normal for this format and prints legibly at 300dpi on the target Epson ColorWorks C6000, but **is not intended to be shrunk further**. Don't reduce any base font-size in `master-label.svg` without a physical test print.
- `coa_qr`'s box is 18×18pt (0.25in × 0.25in). This is at the small end of reliably-scannable QR sizes — always test-scan a printed sample with a phone camera when introducing a new QR destination URL length (longer URLs need more QR modules, which reduces the size of each module within the same physical box).

## Safe print margins / bleed

- `label-spec.json` → `safeArea.insetPt` (3pt) documents the recommended minimum distance from the trim edge for live content. Every region in `layout.json` already clears this inset by construction — but **this is not automatically enforced**: if you hand-edit `master-label.svg` and move an element closer to the edge than 3pt, no build step will catch it. Re-run the visual review (`label-preview.png`) after any structural edit.
- `label-spec.json` → `bleed` is `0` on all sides — this format is a single pre-sized die-cut/kiss-cut label printed at 100%/Actual Size; the print is the trim, so there's no bleed to account for. The field exists (not hardcoded away) so a future larger-sheet format built on this same engine can set a nonzero value without a schema change.

## What is NOT validated (known gaps)

- No automatic contrast-ratio check between `colors.background`/`colors.primary` (a brand-profile with very low contrast will build successfully but may be hard to read).
- No automatic check that a custom `heading`/`subheading` font's actual glyph widths match the auto-fit heuristic's assumptions (see "Text overflow" above).
- `productCategory` (product-profile.json, optional) is accepted and schema-validated but not yet rendered on the physical label or checked against any controlled vocabulary.
- **Spacing is not yet a theme token.** Every component's position/size in `layout.json` is fixed (that fixed geometry is what makes the auto-fit and validation guarantees above possible at all on a label this small — 0.77in tall). A brand-profile can restyle color, font, border, and icon/logo assets, but cannot currently widen a gap between two elements or otherwise adjust spacing; doing so safely would require re-tuning and re-testing the whole layout's overlap guarantees, not just adding a token. Treat this as a known, deliberate limitation of the current physical format rather than an oversight.
