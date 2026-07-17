# Developer Integration Guide

How to consume this package from a future website, mobile/desktop app, or backend service.

## The contract

Three JSON-describable inputs produce every deliverable, deterministically:

```
src/master-label.svg   (canonical layout, stable element ids)
        +
themes/*.theme.json    (colors, fonts, logo path, QR caption, default claim)
        +
field-maps/*.field-map.json   (brand/product/tracking values for one specific label)
        =
dist/<name>/{label.svg, label-preview.png, label-print.pdf, manifest.json, assets/}
```

`spec/label-spec.json` is the registry tying it together — it is machine-readable and is the thing to parse if you're writing your own integration instead of shelling out to `scripts/build.js`.

## Option A — shell out to the build script (fastest integration)

```bash
node scripts/build.js --theme <theme.json> --fields <field-map.json> --out <dir> [--zip]
```

- Exit code `0` on success, non-zero on any failure (missing required field, element id not found, PDF size mismatch, etc.) — treat non-zero as a hard failure, not a warning.
- Everything written to `<dir>` is self-contained (relative asset paths only). Copy/zip/upload it as-is.
- `<dir>/manifest.json` gives you machine-readable provenance: template version, theme id, every applied field value, and the PDF dimension verification result. Parse this to confirm a build actually did what you asked before using its outputs downstream.

This is the recommended integration path for a backend job (e.g. "customer submits a quote → generate their private-label artwork").

## Option B — generate a field-map/theme programmatically, then build

Your app almost never needs to touch `master-label.svg` directly. Instead:

1. Validate your data against `spec/schema/field-map.schema.json` (and `theme.schema.json` if you also let users pick brand colors).
2. Write it to a temp `.json` file (or pipe JSON into a small wrapper — `build.js` currently expects file paths, not stdin).
3. Call `scripts/build.js` as in Option A.

## Option C — embed the pipeline as a library

`scripts/build.js` exports `build({ theme, fields, out, zip })` as a normal Node function (see `module.exports` at the bottom of the file) — `require('./scripts/build').build(...)` from another Node process instead of shelling out, if you want in-process error handling instead of parsing an exit code.

The individual steps are also independently reusable from `scripts/lib/`:

| Module | Function | Purpose |
|---|---|---|
| `lib/xml.js` | `loadSvg`, `serialize`, `byId` | Parse/serialize the SVG DOM, look up elements by id |
| `lib/applyTheme.js` | `applyTheme(doc, labelSpec, theme)` | Mutate a loaded SVG DOM per `themeTargets`/`fontTargets` |
| `lib/applyFields.js` | `applyFields(...)`, `resolveForRender(...)` | Apply field values (incl. live QR generation), and inline images as data URIs for rendering |
| `lib/generatePng.js` | `generatePng(...)` | Rasterize to PNG at the spec's target DPI |
| `lib/generatePdf.js` | `generatePdf(...)` | Emit an exact-physical-size vector PDF |
| `lib/verifyPdf.js` | `verifyPdf(...)` | Read the PDF back and assert its page size |
| `lib/packageZip.js` | `packageZip(...)` | Zip a directory |

## Important implementation detail: don't rasterize the raw SVG for image-embedded output

If you write your own renderer instead of using `lib/applyFields.js`'s `resolveForRender`, be aware: modern **librsvg silently refuses to resolve local-file `<image>` hrefs** during rasterization — whether given as an absolute path, a relative path, a file input, or a buffer input, it makes no difference, the image is simply skipped and nothing errors. The only reliable fix is to inline every raster image as a `data:image/...;base64,...` URI before rasterizing or before feeding the SVG to pdfkit/svg-to-pdfkit. `resolveForRender` already does this — reuse it rather than re-deriving this the hard way.

## Loading a theme from a future web/app UI

A theme file is plain JSON with no logic — load it, validate against `theme.schema.json`, let a user edit `colors`/`fonts`/`logo.primary` in a form, save it back out, and pass the path to `build.js`. The label's structure (`master-label.svg`) never needs to change for a new brand.

## Versioning expectations

- `spec/label-spec.json.templateVersion` and the package-root `VERSION` file are the source of truth for the template's version — check both match before treating a rebuild as reproducible.
- A breaking change to element ids or the field/theme schemas is a major version bump (see `CHANGELOG.md`). Pin to a specific tag/release if you're building this into automated infrastructure.
