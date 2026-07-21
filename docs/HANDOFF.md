# LA PEPTIDES SALES PLATFORM - COMPLETE SESSION HANDOFF
Prepared 2026-07-16 (America/Phoenix). Audience: any fresh AI session (Claude Code
with repo access) or human picking up this project cold. Companion files: the
repo-root `CLAUDE.md` (rules digest), `PRODUCT.md` + `DESIGN.md` (design law),
`docs/superpowers/specs/2026-07-16-v2-b2b-platform-design.md` (spec + Addenda),
`docs/superpowers/plans/` (executed plans), `docs/EMAIL_ACTIVATION.md` (runbook).

## 0. READ ME FIRST (the 10-line version)
- Product: B2B wholesale platform for LA Peptides (research peptides), modeled on WizCommerce WizOrder/WizShop, owned by JJ Gilmore.
- Active code: `~/Projects/lapeptides-portal-v2` (git worktree, branch `redesign/v2`), app in `sales-portal/`. Live at https://lapeptides-portal-v2.vercel.app (client storefront at `/store`).
- Frozen comparison build: `~/Projects/lapeptides-portal` + https://lapeptides-portal.vercel.app - DO NOT MODIFY.
- One shared live Supabase Postgres behind BOTH deployments - schema changes must be strictly additive; live data writes need JJ's named approval (an automated permission classifier enforces this).
- Phases 1 (rep app + admin CRM), 1.5 (samples, brand kit, view-as, retail band), and 2 (client portal) are COMPLETE, deployed, verified. Phase 3 (payments) is specced only.
- Test floor: 146 vitest green. Verification: `sales-portal/scripts/crawl.mjs` (3 personas). Never report done without typecheck+test+build+crawl+live check.
- Pricing sheets + lapeptides.net are the only price sources. NEVER invent/estimate/round a price. Flag gaps, don't guess.
- RUO compliance language is mandatory on every product/quote/store surface.
- No em dashes in ANY copy, code comments included (JJ global rule; use " - ").
- Open items: JJ owes a resend.com key (runbook ready), missing cost sheets, and a lapeptides.net IGF-1 price fix; Phase 3 and go-live start on his word.

## 1. PEOPLE, BUSINESS, AND HOW TO WORK WITH JJ
- **JJ Gilmore**: owner/operator. Style: be direct, one recommendation not menus, plain-spoken, report failures honestly, never claim unverified work. Confirm before outward-facing or hard-to-reverse actions; approval in one context does not carry to the next. He often replies in terse fragments ("ok", "start it", "wipe it") and pastes Otter.ai call transcripts as requirements - treat transcripts as requirement sources and confirm ambiguities with him.
- **Danny**: CEO, admin login exists, source of the hard-cost sheets, runs the print operation for vial labels.
- **Spencer Mikesell**: rep; drove field feedback (sub-MOQ request, the 5-layer label template workflow: 4 fixed layers + editable layer 5 = peptide name + mg, artwork pulled per-customer from the portal brand kit).
- **Justus Gilmore**: rep.
- LA Peptides contact truth: uniquesalesinc@gmail.com / 602-321-8381. NEVER use (208) 996-0435 or partnership@totemlcg.com in LA Peptides materials (a past cross-venture leak, since fixed). JJ's other ventures (ASAAR Medical, Totem LC Group) must never mix with this project.
- Demo-grade passwords are deliberate ("We're small enough; no one's gonna care" - JJ). Rotate at go-live.

## 2. ENVIRONMENTS, CREDENTIALS, DEPLOY
### URLs
- v2 (active): https://lapeptides-portal-v2.vercel.app - staff app at `/`, client storefront at `/store`.
- v1 (frozen): https://lapeptides-portal.vercel.app - health-check it (expect 200 on /login) after any shared-DB change.
- Retired third deployment: an old "CEO demo" from the scrapped build at `~/Projects/la-peptides-sales-portal` - reference only; kill at go-live. Marketing site repo: `~/Projects/lapeptides-site` (lapeptides.net source) - out of scope.

### Logins (all password `ChangeMe123!`)
| Who | Email | Surface/role |
|---|---|---|
| JJ | uniquesalesinc@gmail.com | staff ADMIN |
| Danny (CEO) | danny@demo.lapeptides.net | staff ADMIN |
| Jordan Reyes (demo rep) | rep1@demo.lapeptides.net | staff SALES_REP - **use this for rep testing** (owns "Acme Recovery Labs (Demo)") |
| Spencer | spencer@demo.lapeptides.net | staff SALES_REP - owns ZERO customers (assign via Customer 360 UI if needed) |
| Justus | justus@... (exists) | staff SALES_REP |
| Test client | test-portal-user@demo.lapeptides.net | PortalUser on Acme, status ACTIVE, name literally "Test Portal User (safe to delete)" |

### Env & secrets
- `sales-portal/.env` (gitignored, JJ-created, never paste values into chat): `DATABASE_URL` (Supabase transaction pooler :6543, `pgbouncer=true`), `DIRECT_URL` (:5432, used by `directUrl` in schema.prisma for migrations), `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `NEXTAUTH_URL="http://localhost:3005"` (LOCAL TRAP - see Gotchas #7). Vercel additionally has `AUTH_URL=https://lapeptides-portal-v2.vercel.app` (pinned to prevent the `__Secure-` cookie-prefix mismatch that once broke sessions).
- Supabase project: `rbxqskyxlquxilplblul`. No Supabase API keys in env (that's why brand assets are Postgres bytea, not Storage).
- `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` do NOT exist yet - see Open Items #1.
- Vercel: team `my-honey-co`; CLI token at `~/Library/Application Support/com.vercel.cli/auth.json`; deployment SSO protection disabled on both projects (API PATCH `{"ssoProtection": null}`).

### Deploy procedure (exact)
```
cd ~/Projects/lapeptides-portal-v2/sales-portal   # NEVER from repo root - root also has a .vercel link and root deploys fail in ~7s with "npm run vercel-build exited 1"
vercel --prod --yes
vercel ls lapeptides-portal-v2                    # confirm READY
CRAWL_BASE=https://lapeptides-portal-v2.vercel.app node scripts/crawl.mjs
curl -s -o /dev/null -w "%{http_code}" https://lapeptides-portal.vercel.app/login   # v1 must stay 200
```

## 3. REPO MAP (paths relative to ~/Projects/lapeptides-portal-v2)
- `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md` - rules + design-system law. Read before ANY UI work.
- `docs/superpowers/specs/2026-07-16-v2-b2b-platform-design.md` - the spec: Phase 1 scope, Phase 2/3 decisions, Addendum A (retail band + brand kit + view switching, item 1 superseded in place), Addendum B (IGF-1 evidence).
- `docs/superpowers/plans/2026-07-16-phase-1-rep-app-admin-crm.md`, `...phase-2-client-portal.md` - executed plans.
- `docs/EMAIL_ACTIVATION.md` - email runbook (ready for JJ).
- `sales-portal/prisma/schema.prisma` + `prisma/migrations/` - see §5.
- `sales-portal/prisma/seed-data/pricing-source.ts` - verbatim wholesale sheets (837 price points, cross-verified). BULK_RETAIL_TIERS t1 minQty **20**; BULK_WHOLESALE_TIERS band1 minQty **20** (moved from 1 for the retail band, provenance comment inline).
- `sales-portal/prisma/seed-data/retail-source.ts` - verbatim lapeptides.net transcription: `RETAIL_PRICES` (71 rows), `RETAIL_UNMATCHED`, `RETAIL_GAPS` (56 SKUs with no site price -> no 1-19 band), suspects block (AOD-9604 10mg $49.99 vs T1 $50; VIP 10mg $59.99 vs $60 - kept; IGF-1 LR3 - excluded).
- `sales-portal/prisma/seed-data/cost-source.ts` - ADMIN-ONLY hard costs, 99 rows, bands mirror wholesale. Documented aliases. Missing: NAD+, KLOW 80mg, sprays/creams/capsules, HCG.
- `sales-portal/src/lib/pricing/` - `engine.ts` (pure; mixed FLOOR_ONLY+BAND selection: bands break on match, floors accumulate; graceful "No price on file for <tier>" non-qualifying path replaces the old throw), `resolve.ts` (server-authoritative pricing; `resolveSampleLine`), `clientPreview.ts` (`previewLinePricing`, `cartPooledQuantity` excludes samples, `repriceCart`, `samplePricing`; per-tier basis inference: maxQty!=null => BAND), `priceLists.ts` (`RETAIL_BAND_TIER` tier 0 "Retail (1-19 units)" BAND 1-19; `retailPriceFor()`; `RETAIL_EXCLUDED = {"IGF-1 LR3|1mg"}`; `tiersFor()` per list; entry builders prepend tier-0 prices), `costs.ts`, `engine.test.ts` (sheet-conformance suite).
- `sales-portal/src/lib/actions/` - quote-actions (saveQuoteDraft: server re-prices everything, pooled qty excludes samples, sample lines persist unitPrice 0 + pricingTierLabel "Sample"; finalizeAndSendQuote + acceptQuoteAsOrder both enforce the 20-unit minimum), client-order-actions (`placeClientOrder`), client-cart-actions, client-auth-actions, client-brand-actions, brand-actions, lead/task/activity/portal-user actions.
- `sales-portal/src/lib/` - `clientAuthToken.ts` + `clientSession.ts` + `clientCookie.ts` (client auth), `viewAs.ts` + `viewAsToken.ts` (admin view-as), `session.ts` (requireUser/requireAdmin), `invoiceTerms.ts` (`computeDueDate` parses TEXT "Net N"; "Prepaid" and unknown -> due now), `format.ts` (ALL date formatting pinned to America/Phoenix - removing this reintroduces a hydration white-screen), `email.ts` (honest sent:false wrapper), `prisma.ts` (global `omit` for Quote.origin/ruoAcknowledgedAt + brand columns + BrandAsset.data - the pattern that lets code deploy before its migration applies).
- `sales-portal/src/components/` - `shell/` (staff app shell + view-switch sidebar), `order/` (Order Mode incl. `orderMode.ts` reducer - line identity is variantId+isSample; `QtyInput.tsx` draft-style input), `store/` (client storefront), `customers/`, `dashboard/`, `reports/`, `quotes/` (legacy wizard at /quotes/new still works).
- `sales-portal/src/app/` - staff routes under `(portal)/`, public quote at `q/[token]`, client storefront under `store/` (REAL segment, not a route group - root `/login` and `/account` belong to staff), `api/brand-assets/[id]` (dual staff/client auth), `api/q/[token]/pdf` (public - in middleware PUBLIC_PREFIXES).
- `sales-portal/scripts/` - `crawl.mjs` (3-persona verification), `apply-retail-band.mjs` (idempotent live pricing script - ALREADY RUN, dry-run shows 0 pending), `check-retail.mjs`, `verify-email.mjs`.

## 4. PRICING MODEL (current, complete - this is the heart of the product)
1. Two injectable ladders assigned PER CUSTOMER via existing TEXT column `Customer.defaultPriceListCode` ('BULK_RETAIL'|'BULK_WHOLESALE'). Reps can override per order (visible "Overridden" state).
2. **Retail band (tier 0)**: qty 1-19 prices at the lapeptides.net single-unit retail price per SKU, on BOTH ladders and all format lists. Purpose (JJ): reps show the single-vial price and "walk them up" the ladder.
3. Printed tiers from 20: Bulk Retail floors 20/50/75+ (FLOOR_ONLY); Bulk Wholesale bands 20-99/100-299/300-499/500-999/1000+ (band 1 floor moved 1->20).
4. Formats: sprays/creams flat sheet price from 20 (Danny 7/15 flat rule, band-shifted); capsules $65 at 20-49 with the 49-unit ceiling RESTORED (50+ = custom quote); capsules always qualify on their own quantity (pooling-exempt).
5. **Mix-and-match pooling**: pooled non-sample unit total qualifies the tier for every injectable line; each line bills its own units.
6. **Samples**: $0.00 lines (Sample button on cards), never pool, coexist with a paid line of the same variant, tracked via `pricingTierLabel === 'Sample'` (deliberate no-schema marker) in Customer 360 / Products report / Team report.
7. **Order minimum**: <20 total non-sample units = draftable but NOT sendable/convertible (staff) and NOT checkout-able (client). Server-enforced in finalizeAndSendQuote, acceptQuoteAsOrder, placeClientOrder; client UIs mirror it.
8. **Gap SKUs** (56): no site retail price -> no 1-19 band -> engine returns non-qualifying "No price on file for Retail (1-19 units)... reach Tier 1" below 20.
9. **IGF-1 LR3 1mg**: excluded from the retail band (`RETAIL_EXCLUDED`). Evidence (spec Addendum B): site $59.99 is 0.63x its bulk T1 ($95) while the catalog median site:T1 ratio is 1.6x (n=46; pattern-price ~$152); the sheet ladder 95/88/80.50 + wholesale 73.50-45 + cost $19 is coherent. Conclusion: the WEBSITE price is the anomaly; fix belongs on lapeptides.net; portal unchanged under any ruling.
10. Old quotes NEVER reprice - QuoteLineItem stores immutable snapshots (unitPrice, lineTotal, pricingTierLabel, priceListName, effectiveDate); only draft re-saves and duplicates re-resolve.
11. Superseded rules (do not resurrect): "floor to 5 at T1" (Spencer 7/16 morning, replaced same day by JJ's retail-band model; its `apply-submoq.mjs` was deleted and its DB update NEVER ran); capsule "ceiling retired" (restored with the band model).
12. Terms: existing TEXT `Customer.paymentTerms` with values "Prepaid"|"Net 15"|"Net 30"|"Net 60" (a Prisma `PaymentTerms` enum exists in the DB but is intentionally unused by app code - never retype live columns).
13. Discount rule (director requirement): per-user `discountLimitPercent`; over-limit adjustments get `requiresApproval=true` and block sending until ADMIN approves (`Adjustment.approvedById`). Server authoritative. NO self-serve coupon codes ever (deliberate decision).
14. Price anchors for tests: BPC-157 10mg = retail $59.99 / BR T1-T3 37.50/35.00/32.50 / BW T1-T2 30.00/22.00; Ipamorelin 10mg retail 49.99, BR T1 30.00; GHK-Cu 50mg BW T1/T2 18.00/14.00 (it's a retail-band GAP - site sells only 100mg); capsules 65 wholesale / 70 MSRP-metadata / 79.99-229.99 site retail. Site GLP masking: GLP-1(S)=Semaglutide, GLP-2(T)=Tirzepatide, GLP-3(R)=Retatrutide; LA-31=SS-31 (slug /ss-31/); Melanotan 2=Melanotan-II; BPC/TB500 Blend=BPC-TB; CJC NO DAC/Ipamorelin Blend=Ipa/CJC; site Repair/Smooth/Tan = the three creams; Thymalin site=10mg vs portal=20mg (size conflict, unmatched).

## 5. DATABASE (shared, live - handle like production)
- Migrations applied, in order: `20260715210000_capsules_price_list`, `20260716010000_variant_costs`, `20260716120000_crm_phase1` (Activity/Task/Lead/PortalUser + Customer.crmStatus/billingAddress/shippingAddress; discovered defaultPriceListCode/paymentTerms/Invoice.dueDate already existed as live columns - reused, never retyped), `20260716200000_brand_kit` (BrandAsset bytea + 5 Customer brand columns), `20260716230000_client_portal` (QuoteOrigin enum, Quote.origin default REP, Quote.ruoAcknowledgedAt, ClientCart unique-per-PortalUser, ClientCartItem unique per cart+variant).
- Data scripts already run: `apply-retail-band.mjs` (5 tier-0 creates, 4 first-tier floor updates to 20, 113 retail PriceListEntry rows - idempotent, verified 0 pending on re-run), em-dash label fix (7 PricingTier labels), test-row wipe (below).
- Test-row hygiene protocol (established): create self-labeled rows ("... (safe to delete)"), enumerate with a read-only query FIRST, wipe by exact IDs/numbers in one transaction, report counts. Last wipe removed: 8 test quotes (LAQ-2026-00001/3/4/5/6/7/8/11) + 13 line items + 6 adjustments + 1 approval record + 10 activity logs, ZZ Test lead/customer/task, 6 verification activities/tasks, and reverted Summit Wellness (Demo) terms to "Prepaid". First attempt hit an FK on an unenumerated quote and rolled back cleanly - enumerate children too.
- Still in DB on purpose: the test PortalUser (Acme) - Phase 2 crawls depend on it. `clientCart.count()` = 0.
- ActivityLog.action is a CLOSED enum - client-portal orders log as `QUOTE_CREATED` with actorId null (actor is a PortalUser) and a "placed via client portal by <name>" description.

## 6. SECURITY MODEL (verified invariants - preserve in every change)
- Staff: NextAuth v5 credentials -> `User` (SALES_REP | ADMIN). Reps see only their book (`assignedRepId` scoping in every data function); admin routes (`/reports`, `/pricing`, `/settings`, `/dashboard/leads`, `/customers/portal-users`, `/dashboard/client-carts`) requireAdmin server-side.
- Hard costs: `requireAdmin()` INSIDE `src/lib/data/costs.ts` - the boundary is the data function, not the page.
- Admin view-as: HMAC-signed `lap_view_as` cookie (AUTH_SECRET), honored ONLY for ADMIN sessions, read-scoping only, writes always audit as the admin, amber banner + exit. Forged/stolen-value cookies proven inert for reps.
- Clients: `PortalUser` + HMAC-signed `lap_client_session` cookie (30d, httpOnly, lax). `requireClient()` re-verifies signature+expiry+ACTIVE status on every request (middleware check is UX-only). Client cookies open ZERO staff routes; staff sessions open zero client-account routes; both directions E2E-asserted in the crawl. DISABLED users bounce even with valid cookies.
- Price gating: `storeCatalog.ts` strips prices at the data layer for anonymous sessions - a logged-out page cannot serialize a dollar amount (crawl asserts zero `/\$\d/` in `[data-testid="store-grid"]`).
- Brand-asset serving route: staff scoped by role/book; clients only their own customer's assets (foreign = 403); anonymous = redirect. Clients can delete only client-portal-uploaded assets (provenance prefix in `note`; `uploadedById` null for client uploads).
- Client checkout requires the literal checkbox "I acknowledge these products are for research purposes only and not for human consumption" (zod `z.literal(true)`), persisted as `Quote.ruoAcknowledgedAt`.

## 7. FEATURE INVENTORY (what exists, by surface)
- **Rep Order Mode** (`/order`): customer drawer (`?selectCustomer=1` opens it; `?customerId=` preselects), ladder chip w/ override state, category chips, `/`-key search overlay, rails (previously purchased / most ordered / trending 90d), product cards (clickable tier bands set qty; QtyInput allows full clear-and-retype, commits on Enter/blur), Sample buttons, cart (pooled tier bar, line notes, line discounts w/ approval chip, order-minimum notice, Create quote / Create order), sessionStorage persistence, draft-id reuse on retry.
- **Staff misc**: product detail pages, quotes list (+ `?origin=CLIENT` chip + CLIENT badges) & detail & legacy wizard, invoices + PDF, public quote page `q/[token]` (approval form, RUO line) + public PDF.
- **Customer 360** (`/customers/[id]`): facts, stats (incl. Samples sent), tabs Orders|Quotes|Invoices|Activity|Tasks|Brand, admin commercial controls (ladder/terms/rep/status/addresses), "New quote" -> `/order?customerId=`.
- **Brand kit** (staff tab + client page `/store/account/brand`): PNG/JPEG/SVG/PDF <=8MB, Postgres bytea, kinds LOGO|SOCIAL_MEDIA|VIAL_LABEL|OTHER, hex colors (primary/secondary/accent) + font/brand notes. next.config `bodySizeLimit` raised to 10mb for uploads.
- **Dashboard** (`/dashboard` + /sales /engagement /tasks /leads): role-scoped KPIs, reorder radar (median-gap; >=3 orders; one-click REORDER_RADAR task), engagement metrics, task queue, admin Leads inbox (approve->create customer w/ rep+ladder+terms, link-to-existing dedup via matchLeadType, reject; emails honest-false), Open client carts card (+ `/dashboard/client-carts`) with ABANDONED_CART task creation.
- **Reports** (admin): Sales/Customers/Products/Team, filter chips (time/customer/rep/pricelist via searchParams), leaderboards, samples columns, discount requests vs approvals.
- **Admin sidebar**: collapsible Admin view, Sales rep view (view-as), Customer view (jump to 360); Customers area tabs Customers|Leads|Portal Users.
- **Portal Users admin** (`/customers/portal-users`): create (with password or PENDING_INVITE), invite (status->INVITED + honest email), disable/enable, reset password (promotes PENDING_INVITE->ACTIVE), last login/active columns. Transitions are a tested pure helper (`portalUserTransitions.ts`). bcrypt cost 12.
- **Client storefront** (`/store`): public browse (categories, search, product pages, recently-viewed localStorage rail), verbatim lapeptides.net compliance footer, login/signup (signup -> Lead source WEBSITE, no account created), per-customer pricing incl. retail band ("Your pricing - <ladder>" chip), server-side persistent cart (steppers/notes/remove, pooled pricing, minimum notice), checkout Shipping->Review (addresses prefill from customer, saved on placement), placeClientOrder -> Quote{origin CLIENT, status SENT, owner = customer's assignedRep, publicToken, cart cleared in-transaction, rep notification email honest-false}, confirmation page (status "Received - pending review", PDF, Reorder), account (order history + Brand kit link).

## 8. VERIFICATION STANDARD (do this before claiming anything works)
```
cd ~/Projects/lapeptides-portal-v2/sales-portal
npm run typecheck && npm run test && npm run build          # 146-test floor
npx next dev -p 31XX &                                       # pick a fresh port
NEXTAUTH_URL=http://localhost:31XX CRAWL_BASE=http://localhost:31XX node scripts/crawl.mjs
```
Test-count history for context: 46 (inherited) -> 50 (CRM) -> 63 (Order Mode) -> 66 (cart) -> 72 (radar) -> 79 (reports) -> 84 (retail-floor interim) -> 90 (view-as) -> 96 (samples) -> 101 (retail band) -> 116 (portal users) -> 128 (client auth) -> 135 (storefront) -> 146 (checkout; held through Tasks 5-6).

## 9. BUILD CHRONOLOGY + COMMITS (redesign/v2; `git log` is authoritative for SHAs not listed)
Inherited (pre-session): spec + 9 director requirements -> two parallel builds reconciled, cloud PR chosen as base -> Supabase wired -> auth fixes -> 837/837 price parity (6 transcription fixes) -> hard costs -> field feedback round 1 (flat formats, tier tables, category chips, pooling confirmed) -> hydration fix -> v2 worktree + Vercel project created as a "side-by-side redesign playground".
This session: JJ pivoted v2 from reskin to full WizCommerce-pattern platform (8 screenshot batches + transcript; brainstormed, specced, planned). Phase 1 tasks 1-10: `6e7ed52` shell/tokens, `61eab6a` CRM schema, `a26185d` CRM data, `f69243a` Order Mode browse, `713bc37` cart+create, `3ac9763` product detail, `026aa3b` Customer 360, `6f801d4` dashboard/leads/radar, `7530a83` reports, `64115d2` retheme sweep (+`28fcad1` crawl hardening) -> deployed. Fixes: RUO on public quote page; qty-input clear/retype + clickable tier bands. Phase 1.5: `6fcfa83` retail-floor-5 (superseded), `d7aa653` brand kit, `fb2eb49` view switching, Danny admin, `56ac5c1` samples (built inline), retail transcription commit, `d9a2763` retail band + order minimum (+ order-button gate fix) -> `apply-retail-band.mjs` run on JJ's "run the retail band script". Wipe on "wipe it". Phase 2 on "start it": `952b312` schema+portal users, `1992229` client auth, `8cee3bc` storefront, `9b83546` checkout, `e8c930e` brand uploads+cart radar, `02595a9` crawl store persona -> deployed + live-verified. Final: email runbook + verify script + IGF-1 Addendum B; project CLAUDE.md.

## 10. HARD-WON GOTCHAS (each cost real time - do not relearn)
1. Anthropic 529 "Overloaded" kills background subagents while the main session works. If subagents die repeatedly, build INLINE; resume partial work from disk.
2. The permission classifier requires JJ's NAMED approval for live-DB writes. State the exact action; have JJ name it ("run the retail band script", "apply the brand migration", "wipe it"). Bare "ok" to a numbered list can fail. Enumerate wipes read-only first, delete by exact IDs.
3. WebFetch drops WooCommerce variant data (and once hallucinated an AOD-9604 5MG variant). For site prices: curl the raw page and parse `data-product_variations` / JSON-LD. Raw source wins.
4. Deploy only from `sales-portal/` - repo root has a second `.vercel` link that fails builds.
5. Playwright flakes: drawer/popover overlays (`div.fixed.inset-0.z-40`) intercept clicks - press Escape, use force, avoid opening the ladder popover mid-script; drawer rows: click `button:has-text("Acme Recovery Labs")`. Cold-start live logins can exceed 30s once - re-run before diagnosing.
6. Local wifi flaps produce `net::ERR_NETWORK_CHANGED` crawl noise against live URLs - verify with curl, re-run; the server has never actually been at fault.
7. `.env` pins NEXTAUTH_URL=http://localhost:3005 - NextAuth v5 rebuilds redirect origins from it, so local crawls on other ports escape to a stale 3005 server. Override NEXTAUTH_URL per-process; do NOT edit .env.
8. Prisma schema-ahead-of-DB breaks default selects (P2022). Pattern: global `omit` in `src/lib/prisma.ts` for new columns + explicit-select loaders that catch P2021/P2022 - lets code deploy before its migration.
9. Date formatting must stay pinned to America/Phoenix (`src/lib/format.ts`) or React hydration errors (#425/#418/#423) return after 5pm AZ.
10. `User` model uses `status: "ACTIVE"` (UserStatus), not `isActive`; PortalUser bcrypt cost 12.
11. Seeded quote snapshots keep pre-fix em-dash tier labels (accepted); fresh reseeds emit hyphens and the retail band natively.
12. Reseeding the live DB logs everyone out mid-run - announce downtime to JJ first.
13. Gap SKUs in a client cart show "unpriced" below 20 units (correct per the model); the admin open-carts card values carts exactly as the client sees them.
14. No global git identity on this machine - commit with `git -c user.name="JJ Gilmore" -c user.email="jack.jj.gilmore@gmail.com"` and the trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## 11. DECISIONS LOG (deliberate, do not silently reverse)
- Copy WizCommerce UX patterns, never their skin. Deliberately skipped: AI copilot, image/barcode search, offline mode, ERP sync, multiple named carts, wishlists, claims, per-customer SKU visibility, coupon/promo codes, storefront theme picker, credential-swap impersonation (view-as instead), WordPress builder, "Login as user".
- `/store` is a real path segment (root `/login` + `/account` are staff's).
- Client logins are `PortalUser`, never `User` - keeps surfaces disjoint by construction.
- Capsule $70 = suggested-retail metadata only, never quote math.
- Canonical demo rep for automation: rep1. Sample tracking marker: `pricingTierLabel === 'Sample'` (no schema column, on purpose).
- The wizard at `/quotes/new` was kept as a fallback path, untouched logic.

## 12. OPEN ITEMS (priority order; who owns what)
1. **Email activation (JJ: ~10 min)** - resend.com signup (uniquesalesinc@gmail.com), then `docs/EMAIL_ACTIVATION.md` steps 2-6. Trap handled in the runbook: default sender `no-reply@lapeptides.net` is REJECTED until domain DNS verification; fast path is `EMAIL_FROM_ADDRESS="LA Peptides <onboarding@resend.dev>"`. Verify with `npx tsx scripts/verify-email.mjs <addr>`, then `vercel env add` both vars + redeploy.
2. **IGF-1 LR3 (JJ/site manager)** - fix on lapeptides.net (raise toward the ~1.6x pattern or label as the <95% grade). After the site changes: re-fetch its price, update `retail-source.ts`, remove from `RETAIL_EXCLUDED` in `priceLists.ts`, extend/re-run `apply-retail-band.mjs` (idempotent) with JJ's named go, add its tier-0 test anchor.
3. **Missing cost sheets (JJ/Danny)** - NAD+ 500/1000mg, KLOW 80mg, all sprays/creams/capsules, HCG row if carried. Transcribe verbatim into `cost-source.ts`, add VariantCost rows additively, extend `costs.test.ts`.
4. **Phase 3: payments** (on JJ's word) - spec section exists: ACH (processor decision needed - Stripe ACH suggested), Zelle instructions, payment links, upcoming-payments view; terms/due-date metadata already live; payment records vs invoices, partial payments/refunds.
5. **Go-live checklist** (on JJ's "real now"): rotate every ChangeMe123!, make GitHub repo private (org `uniquesalesinc-hub`), custom domain (portal.lapeptides.net floated), kill the old CEO-demo deployment, merge/branch strategy for `redesign/v2` vs v1, delete the test PortalUser, then treat the DB as production (no more test rows).
6. Minor backlog: PDF templates never restyled; spencer owns no customers (assign via UI if he should test); wishlists/coupons remain intentionally out unless JJ re-decides.

## 13. PROCESS RULES THAT GOVERN THIS PROJECT
- Sheets + lapeptides.net are the only price sources; business overrides need JJ's words and a provenance comment (who/date) in code.
- Additive-only schema; named approval for live-DB writes; verify v1 (200) after every DB change.
- RUO short line: "For research purposes only - not for human consumption." Store footer carries the two verbatim lapeptides.net compliance sentences (in `store/layout.tsx`).
- No em dashes anywhere. Design bans (DESIGN.md): no side-stripe borders, no gradient text, no glassmorphism-as-default, no hero-metric KPI tiles, no identical icon-card grids, no modals (drawers/inline).
- TDD money-path changes against real sheet prices; keep the 146 floor; crawl three personas; verify live logged-in before "done".
- Stack is fixed: Next.js 14.2.18, TypeScript, Prisma 5.22 (+omitApi preview), NextAuth v5 beta, Tailwind, Vitest, Playwright, Resend, Vercel, Supabase, Node 24.
