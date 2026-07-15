# LA Peptides Sales Portal

A mobile-first quoting and invoicing Progressive Web App for authorized LA Peptides sales
representatives. Built with Next.js 14 (App Router), TypeScript, Prisma/PostgreSQL, and
Auth.js.

---

## 1. Architecture Summary

- **Framework**: Next.js 14 App Router, TypeScript throughout, React Server Components for data
  fetching with Client Components for interactive pieces (quote wizard, forms).
- **Styling**: Tailwind CSS with a custom brand token set (`tailwind.config.ts`) matching the
  existing LA Peptides site (deep navy `#0b1220` surface, teal `#00C4A7` accent).
- **Database**: PostgreSQL via Prisma ORM. Full schema in `prisma/schema.prisma` — 20+ models
  covering users, customers, catalog, versioned price lists, quotes, invoices, adjustments,
  payments, approvals, and an audit log. See §4 for the data model rationale.
- **Auth**: Auth.js (NextAuth v5) with a credentials (email/password) provider today; the
  Prisma adapter and `Account`/`Session` tables are already in place so a Google (or other
  OAuth) provider can be added to `src/auth.ts` later with no schema changes.
- **Pricing engine**: A pure, dependency-free module (`src/lib/pricing/engine.ts`) that
  implements tier selection exactly as described in the source sheets, with 32 automated tests
  (`src/lib/pricing/engine.test.ts`) proving it reproduces every one of the ten uploaded PDFs.
  All quote/invoice pricing is **re-resolved server-side** from the database
  (`src/lib/pricing/resolve.ts`) at save time — the client never gets to dictate a price.
- **PDF generation**: `@react-pdf/renderer`, rendered server-side in Node API routes
  (`src/app/api/quotes/[id]/pdf`, `src/app/api/invoices/[id]/pdf`, and a public variant at
  `src/app/api/q/[token]/pdf`).
- **PWA**: `public/manifest.json`, app icons, and a minimal app-shell service worker
  (`public/sw.js`) that caches static assets only — quote/pricing data is always fetched live,
  never served stale from a cache.
- **Email**: Optional, via Resend (`src/lib/email.ts`). Without `RESEND_API_KEY` configured,
  the app does not fake delivery — it logs the message and tells the user honestly that email
  isn't configured, while still generating shareable links.

### Directory guide

```
sales-portal/
  docs/PRICING_AUDIT.md          — pricing sheet audit (read this first)
  prisma/schema.prisma           — full data model
  prisma/seed-data/pricing-source.ts — normalized transcription of the 10 pricing PDFs
  prisma/seed.ts                 — dev-only seed script
  src/lib/pricing/               — pricing engine + tests (the correctness-critical code)
  src/lib/actions/               — server actions (mutations), one file per domain
  src/lib/data/                  — read queries, one file per domain
  src/components/                — UI, grouped by feature area
  src/app/(portal)/              — authenticated app (bottom-nav shell)
  src/app/q/[token]/             — public customer-facing quote approval page
  src/app/api/                   — PDF generation + Auth.js routes
```

---

## 2. Pricing Files Reviewed

All ten uploaded wholesale pricing sheets were reviewed before any code was written. Full
detail, including every conflict found, is in **[`docs/PRICING_AUDIT.md`](docs/PRICING_AUDIT.md)**:

1. `BulkRetail_Tier1.pdf` — Bulk Retail, Tier 1 (20+ bottles/SKU)
2. `BulkRetail_Tier2.pdf` — Bulk Retail, Tier 2 (50+ bottles/SKU)
3. `BulkRetail_Tier3.pdf` — Bulk Retail, Tier 3 (75+ bottles/SKU)
4. `BulkWholesale_Tier1.pdf` — Bulk Wholesale, Tier 1 (<100 bottles/SKU)
5. `BulkWholesale_Tier2.pdf` — Bulk Wholesale, Tier 2 (100–299 bottles/SKU)
6. `BulkWholesale_Tier3.pdf` — Bulk Wholesale, Tier 3 (300–499 bottles/SKU)
7. `BulkWholesale_Tier4.pdf` — Bulk Wholesale, Tier 4 (500–999 bottles/SKU)
8. `BulkWholesale_Tier5.pdf` — Bulk Wholesale, Tier 5 (1,000+ bottles/SKU)
9. `Wholesale_Sprays.pdf` — 3-tier spray pricing (50+/100+/200+ units)
10. `Wholesale_Creams.pdf` — 3-tier topical cream pricing (50+/100+/200+ units)

## 3. Pricing Rules Implemented

- **Two independent price lists** — Bulk Retail (floor-only tiers: qty ≥ minimum) and Bulk
  Wholesale (banded tiers: qty must fall within a stated range) — are modeled as separate,
  non-interchangeable `PriceList` records. A quote is priced against exactly one list at a
  time; the app never blends them (see audit §4.1 for why).
- **Sprays and Creams** use the same floor-only tier shape as Bulk Retail but are a distinct
  product line and price list.
- **Per-SKU minimums** are enforced per line item. Falling short shows the exact shortfall and
  the next tier that would apply — pricing is never silently substituted.
- **No total-order minimum** exists in any source sheet, so the app enforces none by default
  (a field is reserved in Company Settings for later if LA Peptides adopts one).
- **Historical pricing is immutable**: every `QuoteLineItem`/`InvoiceLineItem` stores a full
  pricing snapshot (product name, SKU, strength, quantity, unit price, tier label, price list
  name, effective date). Publishing a new price list creates a new `PriceList` version and
  deactivates the old one — it never overwrites existing rows, so past quotes/invoices are
  provably unaffected by later price changes (see `src/lib/pricing/engine.test.ts`, "Quote →
  Invoice historical pricing preservation").

## 4. Pricing Conflicts / Questions Discovered

Documented in full in `docs/PRICING_AUDIT.md` §4 — summarized here:

1. **Bulk Retail and Bulk Wholesale bands overlap** (e.g. 75–99 bottles qualifies under both
   Bulk Retail Tier 3 and Bulk Wholesale Tier 1, at different prices). Not resolved by
   assumption — needs a business decision on which program applies to which customer type.
2. **TB-500 10mg price inversion** at the Bulk Retail Tier 3 → Bulk Wholesale Tier 1 boundary
   (the only SKU where price goes up before continuing to decline).
3. **Four blend SKUs have zero volume discount** across all 8 bulk tiers (BPC-TB 10/10mg, KLOW
   80mg, Semax/Selank 30/10mg, AOD/Tesa 5/5mg) — may be intentional, flagged for confirmation.
4. **Retatrutide 40mg and Tesamorelin 20mg** discount 2–2.5× more steeply than neighboring
   sizes — possibly a source-sheet copy error.
5. No total-order minimum in any sheet (see §3 above).

None of these were resolved by guessing — they're preserved as-is in the seed data and
surfaced to administrators.

---

## 5. Database Setup

Any PostgreSQL 14+ works — these instructions cover Supabase (recommended, matches the task
brief) and local Postgres for development.

### Supabase

1. Create a project at supabase.com.
2. Project Settings → Database → Connection string → copy the **URI** (use the pooled
   "Transaction" connection string).
3. Put it in `.env` as `DATABASE_URL`.
4. Run migrations (below).

### Local Postgres (development)

```bash
createdb lapeptides_sales_portal
# DATABASE_URL="postgresql://postgres:<password>@localhost:5432/lapeptides_sales_portal?schema=public"
```

### Apply schema + seed

```bash
npm run prisma:migrate     # creates/applies migrations (dev)
npm run seed                # loads company settings, catalog/pricing, demo users, demo data
```

For production deploys use `npm run prisma:deploy` (applies existing migrations without
prompting) instead of `prisma:migrate`.

---

## 6. Environment Variables

Copy `.env.example` to `.env` and fill in real values. Nothing is hardcoded anywhere in the
codebase — every credential is read from `process.env`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `AUTH_SECRET` | Yes | Auth.js session signing secret (`npx auth secret`) |
| `NEXTAUTH_URL` | Yes | Base URL of the deployment (used to build quote/invoice links) |
| `RESEND_API_KEY` | No | Enables real email delivery (password reset, quote/invoice send) |
| `EMAIL_FROM_ADDRESS` | No | From-address for outgoing email |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | For adding Google login later |
| `STORAGE_*` | No | For future uploaded-file storage (product images, raw pricing files) |

---

## 7. Local Development

```bash
cd sales-portal
npm install
cp .env.example .env      # fill in DATABASE_URL and AUTH_SECRET at minimum
npm run prisma:migrate
npm run seed
npm run dev                # http://localhost:3000
```

Run the pricing engine tests (validated against the uploaded sheets):

```bash
npm test
```

Typecheck:

```bash
npm run typecheck
```

---

## 8. Deployment

Any Next.js-compatible host works (Vercel is the simplest path):

1. Push this repo to GitHub (or your Git host of choice).
2. Import the `sales-portal` directory as a Vercel project (set the project root to
   `sales-portal/` since it lives alongside the existing static market-analysis site).
3. Add the environment variables from §6 in the hosting provider's dashboard.
4. Set the build command to `npm run build` (this also runs `prisma generate` via
   `postinstall`) and run `npm run prisma:deploy` as part of your release step (a Vercel
   "Deploy Hook" or a one-off `vercel env pull && npx prisma migrate deploy` works well).
5. Do **not** run `npm run seed` in production — it's explicitly for development only and
   creates fictional demo accounts/customers.

---

## 9. Administrator Setup

1. After migrating, either run `npm run seed` (dev/demo) or manually create the first
   administrator:
   ```ts
   // one-off script or `npx tsx` snippet
   await prisma.user.create({
     data: { email: "admin@lapeptides.net", name: "...", role: "ADMIN", status: "ACTIVE",
       passwordHash: await bcrypt.hash("<temporary password>", 12) },
   });
   ```
2. Sign in and go to **Settings** to fill in company info, quote/invoice number prefixes,
   default payment terms, tax behavior, discount limits, ACH instructions, and PDF footer text.
3. Go to **Sales Reps** to create representative accounts — a temporary password is generated
   and shown once; share it securely. Reps should change it from **Account** after first login.
4. Go to **Pricing** to review the seeded catalog, deactivate any SKUs not yet ready to sell,
   and use **Upload Pricing** when a new pricing sheet needs to be published (see §12).

---

## 10. Test Credentials (development seed data only)

| Role | Email | Password |
|---|---|---|
| Administrator | `uniquesalesinc@gmail.com` | `ChangeMe123!` |
| Sales Rep | `rep1@demo.lapeptides.net` (Jordan Reyes) | `ChangeMe123!` |
| Sales Rep | `rep2@demo.lapeptides.net` (Casey Morgan) | `ChangeMe123!` |

All demo customers, quotes, and invoices are clearly labeled `(Demo)` and use fictional
contact information — no real customer data is included.

---

## 11. Quote and Invoice Workflow

1. **Customer** — search an existing customer, add a new one inline, or continue with a
   temporary prospect, without leaving the quote.
2. **Products** — search/browse the catalog for the quote's price list, add line items with a
   live pricing preview (recalculated instantly on quantity change), edit/duplicate/remove
   lines in the cart.
3. **Charges** — add shipping/handling/testing/packaging/rush fees, sales tax, customer or rep
   discounts (permission-checked against the rep's discount limit — over-limit discounts are
   flagged as requiring administrator approval rather than silently blocked or allowed), set
   deposit %, payment terms, expiration date, and notes (internal vs. customer-facing are kept
   strictly separate).
4. **Review** — full breakdown, save as draft (autosaves on every step transition) or send to
   the customer. Sending requires every line to meet its minimum and every discount to be
   authorized.
5. **Customer approval** — the customer opens a secure `/q/[token]` link (no login required),
   reviews the quote, downloads the PDF, and approves or declines with name/title/comments;
   the response, timestamp, and IP address are recorded.
6. **Convert to invoice** — an approved quote converts to an invoice in one action, copying
   customer info, line items (with their original pricing snapshot), and adjustments — the
   source quote is preserved and linked, never deleted or altered.
7. **Invoice tracking** — send, record partial/full payments (ACH/wire/card/check/cash),
   auto-updates status (Sent → Partially Paid → Paid), computes an "Overdue" state at read time
   from the due date (a 24-hour grace period applies to prepaid invoices so a same-day ACH
   isn't flagged overdue instantly), and supports cancel/void/refund with appropriate
   permission checks.

---

## 12. Publishing New Pricing (Admin → Pricing → Upload Pricing)

Because the ten source documents are PDFs rather than a machine-readable feed, ongoing pricing
updates are published through a CSV upload rather than re-parsing PDFs on every change:

- Format: `sku,tier1,tier2,...` — one column per tier, in tier order, for the price list
  selected.
- The app previews a **diff** (old price → new price per SKU/tier) before anything is written.
- Publishing creates a **new versioned `PriceList`** (the previous version is kept, not
  deleted) and marks it active; every quote/invoice created before that point keeps the exact
  pricing it was created with.
- SKUs omitted from the CSV keep their previous price rather than being dropped.

If LA Peptides later supplies pricing as a structured feed (spreadsheet export, API, etc.)
instead of a formatted PDF letterhead, this importer is the integration point to extend.

---

## 13. Features Completed

- Full role-based auth (email/password, password reset, protected routes, session
  persistence, logout, admin-controlled activation; architecture ready for Google OAuth)
- Product catalog with strength/format selector, live SKU/price updates, category browsing,
  admin activate/deactivate and description editing
- Customer management (CRUD, search/filter, duplicate detection, quote/invoice history,
  follow-up tracking, prospect-to-customer flow)
- Step-by-step mobile quote wizard with live pricing, permissioned discounts, autosave
- Server-side authoritative pricing engine, tested against every uploaded sheet
- Branded quote/invoice PDF generation (print-ready, no clipped/overlapping content — visually
  verified)
- Secure customer-facing quote approval page with acknowledgment capture (name, title,
  comments, IP, timestamp) — no internal data exposed
- Quote → invoice conversion, payments, invoice status lifecycle, ACH-ready fields
- Rep and admin dashboards with the metrics specified in the brief
- Admin pricing administration (browse, activate/deactivate, describe, CSV upload with
  diff-before-publish, full version history)
- Company settings, sales rep management (create/activate/deactivate/discount limits),
  reports with CSV export, and a full activity/audit log
- Mobile-first, installable PWA shell: bottom nav, 44px touch targets, sticky totals/actions,
  numeric keypads, no horizontal scroll (verified at 375px width across every screen), card
  layouts for all rep/customer-facing data

## 14. Remaining Integrations Requiring Credentials

These are architected and ready to wire up, but intentionally **not implemented** without
approved credentials, per the build instructions:

- **Transactional email** (Resend) — needs `RESEND_API_KEY`. Until then, password reset and
  quote/invoice "send" actions log to the server console and tell the user honestly that
  delivery isn't configured, rather than faking success.
- **Google OAuth login** — `src/auth.ts` is structured for an additional provider; needs
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` from a Google Cloud project.
- **ACH/payment processing** — the `Invoice`/`Payment` schema and `achInstructions` field are
  ready for a real processor (Plaid, Stripe ACH, etc.), but no payment processing is
  implemented or simulated, per the explicit "do not create or simulate payment processing
  without approved credentials" instruction. Payments today are recorded manually by staff.
- **File storage** for uploaded pricing source files and product images — `.env.example`
  reserves `STORAGE_*` variables for an S3-compatible provider (Supabase Storage, R2, etc.).

## 15. Confirmation: Pricing Tested Against Source Sheets

`src/lib/pricing/engine.test.ts` contains 32 automated tests, run with `npm test`, including
at least one direct assertion against **every one of the ten uploaded PDFs** — exact minimum
quantity, one unit below minimum, tier boundaries on both sides, multi-SKU quotes, per-SKU
minimums, discount authorization, fee/shipping/tax calculation, and proof that historical
pricing snapshots are immune to later catalog changes. All 32 pass. The full mapping from each
sheet to its corresponding test is in `docs/PRICING_AUDIT.md` §3 and in the test file's
`describe` block names (one per source PDF).

---

## Compliance

All product copy, pricing-sheet disclaimers ("For research purposes only. Products not for
human consumption."), and terminology from the uploaded materials are preserved verbatim. The
application does not generate, and provides no UI path to generate, medical claims, treatment
claims, prescribing language, dosage recommendations, or disease claims.
