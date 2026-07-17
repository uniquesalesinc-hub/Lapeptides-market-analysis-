# Examples

Three fully worked brand + product pairs, proving the same unmodified `master-label.svg` reskins cleanly across distinct visual identities — different logo shape, palette, font stack, border style, and product content each time. `preview.png` in each folder is the actual rendered output, committed so you can see the result without running a build.

| | Palette | Heading font | Logo mark | Product |
|---|---|---|---|---|
| `example-brand-1/` | Cool navy/teal | Archivo (sans) | Circle monogram | BPC-157 5MG |
| `example-brand-2/` | Warm terracotta/green | Georgia (serif) | Diamond monogram | TIRZEPATIDE 10MG (long name — auto-fit exercised) |
| `example-brand-3/` | Deep purple/mint | Verdana (sans) | Hexagon monogram | GHK-CU 50MG |

Each folder contains exactly the two-input contract this engine is built around:

```
example-brand-N/
├── brand.json     — same schema as schema/brand-profile.schema.json
├── product.json   — same schema as schema/product-profile.schema.json
├── logo.svg       — the brand's logo asset, referenced by brand.json -> logo.primary
└── preview.png    — committed rendered output (300dpi)
```

`brand.json`/`product.json` are named generically here (matching how a future website or sales app would think about the two inputs); they validate against the exact same schemas as the more descriptively-named files in `brand-profiles/`/`product-profiles/` at the package root — the filename is not part of the contract, only the JSON shape is.

## Rebuild any example

```bash
node scripts/build-profile.js --brand examples/example-brand-1/brand.json \
                                --product examples/example-brand-1/product.json \
                                --out .build/example-brand-1 --zip
```

Swap in `example-brand-2`/`example-brand-3`, or point `--brand`/`--product` at your own files entirely — this is the same command a new white-label partner's first label is generated with. See `RENDERING-SPEC.md` for exactly what happens between input and output.

Note: `logo.primary` (and every other asset path) inside a `brand.json`/`product.json` resolves **relative to the package root**, not relative to the profile file's own folder — that's why these three set it to `examples/example-brand-N/logo.svg` rather than a bare `logo.svg`.
