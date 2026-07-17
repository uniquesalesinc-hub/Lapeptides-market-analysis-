# LA Peptides Universal Label System

**v2.0.0** — a portable, brand-neutral **white-label label design engine**, reusable across an unlimited number of future brand partners. This is a reusable design engine, not a label for any specific company — no app, website, database, login system, sales tool, or ordering portal is included. It is independent of the sales app, website, pricing tools, and market-analysis work elsewhere in this repository — no shared files or dependencies.

**No real or fictional brand identity is represented anywhere in this package.** A set of reference photos of an existing printed label were used only to study layout structure (a three-section landscape design with divider lines, a QR/lot/UBD verification block, and small-caps micro-type) — every visual region from that reference was rebuilt from scratch as an independently editable object using neutral placeholder content (`YOUR LOGO`, `BRAND NAME`, `PEPTIDE NAME`, `00MG`, `LOT000000`, `MM/YYYY`, etc.). None of that reference's name, logo, tagline, colors, QR code, or lot number appear here.

**Start here:** `manifest.json` is the package-level entry point — it lists every file, every editable region/field id, and what's required vs. optional. If you're new to this package, read `QUICK-START.md` first.

## Documentation map

| Doc | Audience | Covers |
|---|---|---|
| `QUICK-START.md` | Everyone | Install, build the examples, generate a label for a new brand in one pass |
| `DEVELOPER-GUIDE.md` | Web/backend developers | Folder structure, replacing every asset type, embedding the pipeline, Adobe/Canva editing, versioning |
| `RENDERING-SPEC.md` | Developers/integrators | The exact algorithm: brand-profile + product-profile → finished label, step by step |
| `VALIDATION-RULES.md` | Developers/production | Every check the build performs (and what it doesn't) |
| `PRODUCTION-GUIDE.md` | Production/print team | Non-technical review checklist + Epson ColorWorks printing steps |
| `BRAND-PARTNER-GUIDE.md` | New brand partners | Non-technical onboarding: what we need from you, logo guidelines |
| `CHANGELOG.md` / `VERSION` | Everyone | What changed, current version |
| `LICENSE.md` | Everyone | Usage terms |

Four of these also ship as ready-to-send PDFs at the package root: `QuickStart.pdf`, `DeveloperGuide.pdf`, `ProductionGuide.pdf`, `BrandPartnerGuide.pdf`.

## Physical spec

| | |
|---|---|
| Size | 1.77in × 0.77in (44.958mm × 19.558mm) |
| PDF page size | 127.44pt × 55.44pt |
| Raster | 531 × 231px at 300dpi |
| Orientation | Landscape |
| Margins | None |
| Bleed | None (0 on all sides) — a single pre-sized die-cut/kiss-cut label; the print is the trim |
| Safe area | 3pt inset from the trim edge (see `label-spec.json` → `safeArea`) |
| Crop marks | None |
| Coordinate system | 1 SVG user unit = 1pt — `master-label.svg`'s viewBox (`0 0 127.44 55.44`) maps directly onto the PDF page with zero unit conversion |

Print at **100% / Actual Size** — see `PRODUCTION-GUIDE.md` for the full printing checklist.

## Generating a label: the two-input model

Every finished label comes from exactly two inputs layered onto the one unchanging master template:

```
master-label.svg  +  brand-profile.json  +  product-profile.json  →  finished label
   (never edited)      (once per partner)    (once per batch)
```

- A **brand profile** (`schema/brand-profile.schema.json`) carries one partner's identity: logo, colors, fonts, tagline, icon set, QR style. Set up once, reused for every product that partner sells.
- A **product profile** (`schema/product-profile.schema.json`) carries one product/batch's content: peptide name, strength, concentration, LOT, UBD, COA link. A new batch = a new product profile.
- Neither ever requires touching `master-label.svg`, `label-spec.json`, or `layout.json`. See `RENDERING-SPEC.md` for the exact algorithm and `brand-profiles/` / `product-profiles/` for worked examples.

```bash
node scripts/build-profile.js --brand brand-profiles/your-partner.brand-profile.json \
                                --product product-profiles/your-product.product-profile.json \
                                --out .build/your-product --zip
```

## Layer structure

```
MASTER LABEL
├── Background Layer      background, border
├── Brand Layer            brand_logo, brand_logo_secondary, brand_name, brand_subtitle, brand_tagline, brand_decorative_graphic
├── Divider Layer          divider_left, divider_right
├── Product Layer          product_name, product_strength, product_descriptor, product_concentration, product_vial_size, purity_icon, purity_claim, lab_icon, lab_claim
├── Verification Layer     country_icon, coa_qr, qr_caption, lot_label, lot_number, ubd_label, ubd, coa_url
└── Theme Layer            colors, fonts, logo, icons, border, background, dividers, QR style — see default-theme.json / a brand-profile (no coordinates; see "Theme tokens" below)
```

Every id above is an independently editable SVG object — background, border (color/thickness/radius), both divider lines, every logo/icon/graphic, every text field, the QR, LOT, UBD, and both claims. Nothing is flattened or grouped in a way that blocks editing one piece without affecting another; layer order/positioning follow normal SVG document order, editable in Illustrator/Figma/Inkscape exactly as you'd expect.

**The same id is used in three places, always identically**: as the element's `id` in `master-label.svg`, as the `fieldKey`/`elementId` pair in `label-spec.json` → `fields`, and as the region `id` in `layout.json` → `regions`. One flat, snake_case identifier per editable thing — that's the whole integration contract.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | **Start here.** Package-level table of contents — every file, every region/field id, what's required. |
| `master-label.svg` | **Canonical source.** The template structure — open and edit directly in Illustrator/Figma/Inkscape/a browser. Never brand-specific. |
| `label-spec.json` | **Canonical source.** Physical geometry, safe area/bleed, and the field/theme registry mapping ids to elements — the machine-readable contract a future app reads. |
| `layout.json` | **Canonical source.** Percentage-based `x`/`y`/`width`/`height` for every editable region, plus `locked`, `defaultPlaceholder`, `alignment`, and `autoFit` metadata — a renderer at any resolution can position an overlay/editor without parsing the SVG. |
| `default-theme.json` / `example-brand-theme.json` | Legacy flat theme-file interface (still supported) — prefer a brand-profile for new work. |
| `brand-profiles/` | One JSON file per brand partner — identity + styling. See `schema/brand-profile.schema.json`. |
| `product-profiles/` | One JSON file per product/batch — content. See `schema/product-profile.schema.json`. |
| `placeholder-logo.svg` / `placeholder-qr.svg` / `placeholder-icons.svg` | Swappable default assets (visually read "replace me"; the QR placeholder is not scannable). |
| `master-label-preview.png` / `master-label-print.pdf` / `master-label-editable.pdf` | Committed master deliverables — default theme, all placeholders. Reproducible any time via `npm run build:master`. |
| `schema/*.json` | JSON Schemas for every JSON file in this package. |
| `scripts/` | Reusable Node build pipeline (see `DEVELOPER-GUIDE.md`). |
| `LICENSE.md` | Usage terms (proprietary, LA Peptides). |

## Icon set note

`master-label.svg` embeds its own copy of every icon (`<symbol>` defs in `<defs>`, referenced via same-document `<use href="#icon-...">`) rather than pulling from `placeholder-icons.svg` via a cross-file reference. This is intentional: cross-file SVG `<use>` resolution is unreliable across renderers and PDF tooling (see the note in `scripts/lib/applyFields.js`), so the master file stays self-contained and renders identically everywhere. The `<symbol>` ids (`icon-purity`, `icon-lab-tested`, etc.) are internal drawing primitives, not editable-region ids — the `<use>` elements that reference them (`purity_icon`, `lab_icon`, `country_icon`, `brand_logo_secondary`, `brand_decorative_graphic`) are the editable regions. `placeholder-icons.svg` is kept as a standalone, matching reference copy — if you redesign an icon, update both.

## layout.json — percentage coordinates + region metadata

Every region gives `x`/`y`/`width`/`height` as a percentage of the canvas (0–100), plus:

- `layer` — which of the five layers it belongs to
- `locked` — `true` for structural/theme-only regions with no fieldKey (background, border, dividers — position and existence are fixed, never swapped by a profile); `false` for content regions a profile can set a value for
- `defaultPlaceholder` — the master template's built-in default value (text content, image href, or use href)
- `alignment` — `"left"` / `"center"` / `"right"` for text regions, derived from `textAnchor`
- `autoFit` — `{enabled, baseFontSizePt, minFontSizePt}` for the three fields (`brand_name`, `product_name`, `brand_tagline`) whose font-size shrinks to fit long values; `{enabled: false}` for everything else

Text regions also add `baselineYPct` (the SVG baseline, if you need to render real `<text>`) and `textAnchor` (`"start"`/`"middle"`/`"end"`).

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
| `fonts.heading` / `fonts.subheading` / `fonts.body` / `fonts.mono` | `brand_name`/`product_name` headings, subtitle/tagline, body text, LOT/UBD/tracking mono block |
| `logo.primary` | Fallback logo path when a profile/field-map doesn't set `brand_logo` |
| `border.thickness` / `border.radius` | Border stroke width / corner radius (pt) |

Full detail (which element id each token maps to) is in `label-spec.json` → `themeTargets` / `fontTargets`. A brand-profile's `colors`/`fonts`/`border`/`qrStyle` are composed into these same internal tokens by `scripts/lib/composeProfiles.js` — see `RENDERING-SPEC.md`.

## Field keys

Every brand/product/tracking value is a field, keyed by the same flat id used everywhere else (see `label-spec.json` → `fields`). The recommended way to set them is a **brand-profile.json + product-profile.json** pair (see `schema/brand-profile.schema.json`, `schema/product-profile.schema.json`, and the worked examples in `brand-profiles/` / `product-profiles/`). A flat field-map JSON (`{"brand_logo": "...", ...}`) is also still supported as a legacy interface via `scripts/build.js --fields`:

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

`brand_logo`, `brand_name`, `product_name`, `product_strength`, `coa_qr`, `lot_number`, and `ubd` are required; everything else is optional and falls back to the master's neutral placeholder. Both inputs are optional entirely — omit them to build with every placeholder untouched (this is how the committed `master-label-*` deliverables are produced). See `manifest.json` → `requiredContentFieldIds` for the machine-readable version of this list, and `VALIDATION-RULES.md` for everything the build actually checks.

## Build tooling

```bash
npm install
npm run build:master                                    # regenerates master-label-preview.png / -print.pdf / -editable.pdf
node scripts/build-profile.js --brand brand-profiles/example-partner.brand-profile.json \
                                --product product-profiles/example.product-profile.json \
                                --out .build/example --zip           # recommended: brand-profile + product-profile
node scripts/build.js --theme example-brand-theme.json --out .build/example-brand --zip   # legacy: theme + optional field-map
```

Each build: composes/applies the theme, applies fields (generating a real, scannable QR code from `coaQrDestination`/`coa_qr` if present), auto-fits long text where configured, writes a portable `label.svg` (relative asset paths, every referenced asset copied alongside it), renders a 300dpi PNG and an exact-size vector PDF, verifies the PDF's page dimensions against `label-spec.json`, and writes a per-build `manifest.json` into the output directory recording exactly what produced that build. Pass `--zip` to package the output folder for hand-off, `--strict` to make validation warnings fail the build. Full detail in `DEVELOPER-GUIDE.md` and `RENDERING-SPEC.md`.

This tooling is supplementary — the required deliverable is the flat file set above, which any team (web, backend, production, or a future application) can consume directly from `label-spec.json` and `layout.json` without running any of this code.

## Printing on an Epson ColorWorks C6000

See `PRODUCTION-GUIDE.md` for the full checklist. Summary: load media matching 1.77in × 0.77in, print at **100% / Actual Size** (never "Fit to page"), let the driver manage color unless a specific ICC profile applies, no margins/bleed/crop marks needed.

## Portability guarantees

- No dependencies on private local file paths — every path in every source file is relative to the package root.
- No references to proprietary or expiring cloud URLs — QR/COA URLs in this package use `https://example.com/...` / `coa.example.com/...` placeholders; replace with real destinations per brand partner.
- No dependency on Claude, any AI tool, this repository, or any specific computer.
- `npm install` only pulls public npm packages — required solely for the build tooling, not for opening/editing the SVG/PDF/PNG.
- The whole folder is a self-contained, zippable package: email it, upload it to Drive/Dropbox/OneDrive/SharePoint, hand it to a contractor or brand partner, open it in Illustrator/Acrobat/Figma/Canva, store it in git, or wire `label-spec.json`/`layout.json`/`manifest.json` into a future website/app/automated PDF pipeline — all without editing this package itself.

## Future integration

This engine is designed to be consumed — not extended or redesigned — by the LA Peptides website, the sales ordering app, the admin portal, production software, future APIs, and future white-label partner portals. Each of those integrates the same way: supply a brand-profile + product-profile (or call the build pipeline directly, see `DEVELOPER-GUIDE.md`), get back a finished label. See `RENDERING-SPEC.md` for the integration contract in full.

## Versioning

Semantic versioning — see `CHANGELOG.md` and `VERSION`. `label-spec.json`, `layout.json`, `manifest.json`, and `master-label.svg`'s `data-template-version` attribute are kept in lockstep with `VERSION`.

## Upgrading from v1.1.0

v2.0.0 is a breaking release:

- Package folder renamed `LA-Peptides-Universal-Label-Template` → `LA-Peptides-Universal-Label-System`.
- Three element/field ids renamed for clarity: `background_fill` → `background`, `border_frame` → `border`, `divider_1`/`divider_2` → `divider_left`/`divider_right`.
- "Panel" terminology renamed to "Layer" throughout (`brand_panel` → `brand_layer`, `product_panel` → `product_layer`, `verification_panel` → `verification_layer`; the `panel` key in `label-spec.json`/`layout.json`/`manifest.json` is now `layer`).
- `layout.json` regions gained `locked`, `defaultPlaceholder`, `alignment`, and `autoFit` metadata (additive).
- `label-spec.json` gained `safeArea`/`bleed` metadata (additive, both effectively no-ops for this physical format).
- `product-profile.schema.json` gained an optional `productCategory` field (additive, not yet bound to a visual element).
- Full documentation set added: `QUICK-START.md`, `RENDERING-SPEC.md`, `VALIDATION-RULES.md`, `DEVELOPER-GUIDE.md`, `PRODUCTION-GUIDE.md`, `BRAND-PARTNER-GUIDE.md`, plus PDF renders of the four guides, and `LICENSE.md`.

Field-map files written against v1.1.0 need `background_fill`/`border_frame`/`divider_1`/`divider_2` keys renamed if present (uncommon — these are theme-only, not typically set per-field). See `CHANGELOG.md` for the complete diff, and `CHANGELOG.md`'s v1.1.0 entry for the earlier v1.0.0 → v1.1.0 id rename.
