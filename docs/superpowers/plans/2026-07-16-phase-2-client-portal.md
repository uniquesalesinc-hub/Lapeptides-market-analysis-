# Phase 2: Client Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A branded client-facing storefront (WizShop pattern) where approved wholesale buyers log in, see THEIR pricing, order self-serve into an admin approval queue, reorder from history, and upload their brand assets.

**Architecture:** Same Next.js app, new `(store)` route group with its own warmer lapeptides.net-style layout. Client auth is a SEPARATE surface: `PortalUser` credentials -> its own signed JWT cookie (`lap_client_session`), never a `User` session - portal/admin routes stay unreachable by construction. Client pricing reuses the existing engine + the customer's assigned ladder (retail band included). Orders arrive as Quotes flagged `origin=CLIENT` for rep/admin approval. One additive migration (ClientCart, Quote.origin, Quote.ruoAcknowledgedAt).

**Tech Stack:** unchanged (Next 14, Prisma 5, Tailwind lap tokens, Vitest, Playwright crawls).

**Read first, every task:** `/PRODUCT.md`, `/DESIGN.md`, spec Phase 2 section (docs/superpowers/specs/2026-07-16-v2-b2b-platform-design.md). RUO line everywhere product info shows. No em dashes. Storefront = warmer expression of the same design system (white surfaces, teal accents, Outfit headings), NOT the admin shell.

**Working dir:** `~/Projects/lapeptides-portal-v2/sales-portal`. Baseline 101 tests green; never lower. Per-task gate: `npm run typecheck && npm run test && npm run build` + crawl + commit (no push until deploy task).

**Email dependency note:** invites/notifications route through the existing `sendEmail` wrapper (honest `sent:false` until RESEND_API_KEY exists). Admin can always set a portal user's password manually, so the portal works before email goes live.

---

### Task 1: Additive schema + portal-user admin management

**Files:** `prisma/schema.prisma`, `prisma/migrations/<ts>_client_portal/migration.sql` (hand-written, additive, NOT applied by the implementer), `src/lib/actions/portal-user-actions.ts`, `src/lib/validation/portalUser.ts`, `src/app/(portal)/customers/portal-users/page.tsx` + components (Customers area gains tabs Customers | Leads | Portal Users), extend `src/components/shell/navItems.ts` only if needed.

- [ ] Schema: `ClientCart { id, customerId FK cascade, portalUserId FK cascade, updatedAt }` + `ClientCartItem { id, cartId FK cascade, productVariantId FK cascade, quantity Int, note String?, @@unique([cartId, productVariantId]) }`; `Quote.origin QuoteOrigin @default(REP)` (enum REP | CLIENT) + `Quote.ruoAcknowledgedAt DateTime?`; PortalUser already exists (Phase 1).
- [ ] Admin UI: Portal Users tab table (name, email, customer, status chip PENDING_INVITE/INVITED/ACTIVE/DISABLED, last login/active), Add drawer (customer select, name, email, set-initial-password field OR "send invite" when email live), actions: resend invite (records InviteSent activity + email attempt), disable/enable, reset password. Actions all requireAdmin; passwords bcrypt like seed users.
- [ ] Verify + commit. Orchestrator applies the migration after review (JJ already approves Phase 2 scope; still print SQL in the report).

### Task 2: Client auth surface

**Files:** `src/lib/clientAuth.ts` (sign/verify JWT cookie helpers - mirror viewAsToken's HMAC discipline; payload {portalUserId, customerId, exp}), `src/lib/clientSession.ts` (`requireClient()` for store server components/actions; updates lastActiveAt throttled), `src/app/(store)/login/page.tsx` + action (verify bcrypt, set httpOnly cookie, stamp lastLoginAt, status must be ACTIVE or INVITED->ACTIVE on first login), logout action, middleware update (store account routes gated by the client cookie ONLY; `(portal)` routes untouched and never accept the client cookie).
- [ ] TDD the token helpers (roundtrip, tamper, expiry) in `src/lib/clientAuth.test.ts`.
- [ ] "Sign up" link on the login page -> lead form (company, name, email, phone) -> `createLead` with source WEBSITE + confirmation state ("Our team reviews every application").
- [ ] Verify (incl. proof a client cookie cannot open /dashboard: 307) + commit.

### Task 3: Storefront browse (public, prices gated)

**Files:** `src/app/(store)/layout.tsx` (top masthead: LA Peptides wordmark, category nav, search, account/cart icons; footer w/ RUO + FDA disclaimer like lapeptides.net), `(store)/page.tsx` (hero + category tiles + product grid), `(store)/products/[id]/page.tsx`, `src/components/store/*` (StoreProductCard, StoreSearch, CategoryNav), `src/lib/data/storeCatalog.ts` (public catalog: names/sizes/categories WITHOUT prices; priced variant when a client session exists - assigned ladder incl. retail band via existing helpers).
- [ ] Unauthenticated: full browse, "Login to view pricing" where prices would be. Authenticated: per-customer prices w/ tier ladder. Recently-viewed rail (localStorage). RUO line on every product page.
- [ ] Verify (crawl store routes logged-out + logged-in) + commit.

### Task 4: Server-side cart + checkout + approval queue

**Files:** `src/lib/actions/client-cart-actions.ts` (add/update/remove/note - all requireClient, upsert ClientCart per portal user), `(store)/cart/page.tsx`, `(store)/checkout/page.tsx` (Shipping [prefill customer addresses, editable] -> Review -> Place order), `src/lib/actions/client-order-actions.ts` (creates Quote origin CLIENT, status SENT, lines re-priced server-side on the customer's ladder with pooling + sample-less 20-unit minimum enforced, `ruoAcknowledgedAt` REQUIRED - checkbox "I acknowledge these products are for research purposes only and not for human consumption" must be checked, timestamp recorded), `(store)/orders/[id]/confirmation page` (order number, PDF via existing public token PDF route if quote token exists, Reorder button), admin queue: `/quotes` list gains an "Client orders" filter chip (origin=CLIENT, status SENT) + approve path reuses existing approval actions; notification email to assigned rep on placement (honest-email).
- [ ] Account area: `(store)/account` (order history from Quotes origin CLIENT + invoices, one-click Reorder = rebuild cart from a past quote's non-sample lines).
- [ ] Verify with a full Playwright E2E (login as portal user, browse, add 25 units, checkout with RUO checked, quote appears in admin queue with origin CLIENT + ruoAcknowledgedAt set; under-20 blocked) + commit.

### Task 5: Client brand upload + abandoned carts admin view

**Files:** `(store)/account/brand/page.tsx` (client-facing subset of the brand kit: view colors/assets, upload logo/artwork via a client-scoped variant of uploadBrandAsset - new `client-brand-actions.ts` with requireClient + customer scoping), `/dashboard` admin: "Open client carts" card/page (carts w/ items, value at current prices, owner, updatedAt; contents drawer; "Create follow-up task" -> source ABANDONED_CART).
- [ ] Verify + commit.

### Task 6: Full verification sweep + deploy

- [ ] Extend `scripts/crawl.mjs` with a store persona (portal user login + store routes) alongside admin/rep.
- [ ] typecheck/test/build; full crawl; live deploy to lapeptides-portal-v2; live crawl; v1 smoke; screenshots of the storefront to scratchpad; push.

## Self-review
- Spec coverage: storefront+gating (T3), PortalUser auth+invites (T1-2), per-customer pricing (T3), persistent cart+notes (T4), checkout+RUO ack+queue (T4), reorder+recently viewed (T3-4), portal-user admin+login activity (T1), abandoned carts (T5), website leads (T2), client brand upload (T5). Payments stay Phase 3.
- No placeholders; types named against existing modules; every task carries the standard gate.
