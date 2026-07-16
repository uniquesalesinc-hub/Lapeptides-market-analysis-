# DESIGN.md - LA Peptides Sales Platform (v2)

Derived from lapeptides.net (the canonical brand surface). The portal is the working
instrument of the same brand: same palette and type, tuned for data density.

## Theme
Light. Scene: a rep standing in a bright medical-office hallway at 2pm, phone in hand,
showing a buyer a price; an admin reviewing margins on a laptop in daylight. Ambient
light and shared-screen moments force a light UI. No dark mode in Phase 1.

## Color
Strategy: **Restrained** (tinted neutrals + teal accent), with deliberate exceptions:
the sidebar/nav rail runs deep teal ink (committed brand moment), and status colors
carry real meaning. Never #000/#fff; neutrals are tinted toward teal.

| Token | Value | Use |
|---|---|---|
| ink | `#0F1B1F` | primary text |
| slate | `#4A5862` | secondary text |
| page | `#F5FAFB` | app canvas |
| surface | `#FFFFFF` | cards, tables, drawers (keep; it sits on tinted page bg) |
| border | `#D3DFE2` | hairlines, inputs |
| teal | `#0C535E` | primary actions, active nav, links |
| teal-dark | `#073841` | sidebar/nav rail, hero moments |
| teal-bright | `#0DA5BC` | focus rings, highlights, applied-tier accent |
| teal-wash | `#E8F4F6` | selected states, chips, table header tint |
| amber | `#F2A03D` | pending / needs-approval / warning |
| green | `#2D8A5F` | confirmed / paid / healthy margin |
| destructive | `#C9492A` | errors, overdue, thin margin (<30%) |

Charts use: teal, teal-bright, amber, green, teal-dark, in that order.

## Typography
- **Outfit** - headings, page titles, big numbers (weights 500-700).
- **Inter** - body, tables, forms (400/500/600).
- **JetBrains Mono** - SKUs, prices in tables, quote/invoice numbers, tier bands.
  Monospaced prices are a brand signature here: money and doses always align.
- Scale contrast >= 1.25 between steps. Body max 72ch.

## Shape & elevation
- Radius base 0.625rem (10px); chips/badges full-round.
- Elevation by border + subtle shadow (`0 1px 2px rgb(12 83 94 / 0.06)`), never heavy
  drop shadows. Drawers/overlays get one stronger tier.

## Signature patterns (what makes it OURS, not WizCommerce)
- **Deep-teal nav rail** with white icon set; active item gets teal-wash pill.
- **Tier ladders** rendered as bordered mono-type bands, active band filled teal-wash
  with teal-bright left-to-right underline (never a side-stripe border).
- **Category color-coding**: each product category has a tiny tinted dot + label, not
  colored card backgrounds.
- **RUO line** set in 11px Inter uppercase slate, present on product pages, quotes,
  invoices, and client checkout. It is part of the design, not fine print to hide.
- **Approval states** always amber chip + explicit words ("Awaiting approval"), never
  icon-only.

## Bans (inherited, absolute)
No side-stripe borders, no gradient text, no glassmorphism, no hero-metric template,
no identical icon+heading+text card grids, no modal-first flows (drawers and inline
expansion preferred), no em dashes in copy.

## Motion
150-250ms, ease-out-quart. Drawer slide-ins, chip/selection state fades, number
count-ups on dashboard load only. Never animate layout properties.
