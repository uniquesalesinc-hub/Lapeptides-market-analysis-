# LA Peptides Sales Platform - project rules (redesign/v2)

Read FIRST, in order: this file, `PRODUCT.md`, `DESIGN.md`, then
`docs/superpowers/specs/2026-07-16-v2-b2b-platform-design.md` (incl. Addenda A/B)
for scope and decision provenance. Executed plans live in `docs/superpowers/plans/`.
Email activation runbook: `docs/EMAIL_ACTIVATION.md`.

## Hard rules (violating any of these is a failure)
- The Postgres DB is SHARED with the frozen live v1 portal (lapeptides-portal.vercel.app).
  Schema changes are strictly additive (no DROP / ALTER COLUMN / RENAME; new columns
  nullable or defaulted). Live DATA writes happen only after JJ names the specific
  change in his own words. After any DB change, curl v1 /login and expect 200.
- Never modify the v1 repo (`~/Projects/lapeptides-portal`) or its deployment.
- Pricing sources of truth: the wholesale sheets (`prisma/seed-data/pricing-source.ts`,
  `cost-source.ts`) and lapeptides.net (`retail-source.ts`). Never invent, estimate,
  or round a price. Business overrides need JJ's words plus a provenance comment
  (who, date). SKUs in RETAIL_GAPS have no 1-19 band on purpose. IGF-1 LR3 is
  excluded from the retail band pending JJ (see spec Addendum B).
- Current pricing model: retail band tier 0 (1-19 units at site retail) on every
  list; printed tiers from 20 (wholesale band 1 = 20-99; capsules 20-49 with the
  49 ceiling; sprays/creams flat from 20); mix-and-match pooling of non-sample
  units (capsules qualify on their own quantity); samples are $0 lines marked
  `pricingTierLabel === 'Sample'` and never pool; orders under 20 billable units
  draft but never send/convert/check out. Old quotes never reprice (snapshots).
- Compliance: RUO line ("For research purposes only - not for human consumption.")
  on product/quote/store surfaces; store footer keeps the two verbatim
  lapeptides.net compliance sentences; client checkout requires the RUO
  acknowledgment checkbox (persisted timestamp). No medical claims. No em dashes
  in ANY copy (use " - ").
- Auth surfaces stay disjoint: staff = NextAuth `User`; clients = `PortalUser` +
  HMAC `lap_client_session` cookie. Neither may ever open the other's routes.
  Hard costs are admin-only, enforced inside `src/lib/data/costs.ts`.
- Terms are the EXISTING TEXT column values "Prepaid"/"Net 15"/"Net 30"/"Net 60"
  (parsed by `src/lib/invoiceTerms.ts`); same for `defaultPriceListCode` - never
  retype live columns to enums.

## Done = verified
`npm run typecheck && npm run test && npm run build` (146-test floor, never lower),
then the 3-persona crawl (`scripts/crawl.mjs`: admin + rep + store client) with
zero console errors, then a logged-in check on the LIVE deploy. Money-path changes
are TDD'd against real sheet prices first.

## Operational gotchas
- Deploy ONLY from `sales-portal/` (`vercel --prod --yes`); the repo root has a
  second `.vercel` link whose builds fail.
- `.env` pins `NEXTAUTH_URL=http://localhost:3005`; when running dev on another
  port, override NEXTAUTH_URL per-process or auth redirects escape to 3005.
- Date formatting stays pinned to America/Phoenix (`src/lib/format.ts`) or
  hydration errors return.
- New schema columns: add to the global `omit` in `src/lib/prisma.ts` and load via
  explicit selects that catch P2021/P2022, so code can deploy before its migration.
- Commit as `git -c user.name="JJ Gilmore" -c user.email="jack.jj.gilmore@gmail.com"`
  with trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Test rows: self-label "(safe to delete)", enumerate read-only before deleting,
  delete by exact IDs in one transaction, report counts. Canonical test logins:
  rep1@demo.lapeptides.net (rep), test-portal-user@demo.lapeptides.net (client),
  uniquesalesinc@gmail.com / danny@demo.lapeptides.net (admin) - all `ChangeMe123!`
  until go-live.
- Emails record `sent:false` until `RESEND_API_KEY` exists (see the runbook);
  default sender needs lapeptides.net DNS verification in Resend.
- If background subagents die on 529 overload, build inline; resume partial work
  from disk, don't redo it.

## Deliberately out of scope unless JJ re-decides
AI copilot, image/barcode search, offline mode, ERP sync, multiple named carts,
wishlists, claims, per-customer SKU visibility, coupon codes, theme picker,
credential-swap impersonation (cookie view-as exists instead), page builders.
