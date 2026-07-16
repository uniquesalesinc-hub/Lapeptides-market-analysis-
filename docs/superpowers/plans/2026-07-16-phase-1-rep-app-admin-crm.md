# Phase 1: Rep Order Mode + Admin CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the v2 portal as a WizOrder-style B2B app in the LA Peptides light design system: Order Mode selling flow, Customer 360, CRM dashboard (activities/tasks/leads/reorder radar), and admin reports.

**Architecture:** Next.js 14 App Router + Prisma/Supabase + Auth.js, unchanged. The pricing engine (`src/lib/pricing/*`), quote/invoice actions, and auth are REUSED; this is a UI shell rebuild plus one additive schema migration (CRM tables + customer commerce fields). Work happens ONLY in `~/Projects/lapeptides-portal-v2` (branch `redesign/v2`, Vercel project `lapeptides-portal-v2`). The database is shared with the frozen v1 portal: migrations must be strictly additive (new tables, new nullable-or-defaulted columns only).

**Tech Stack:** TypeScript, Tailwind (token-driven), next/font (Inter, Outfit, JetBrains Mono), Prisma 5, Vitest, Playwright (verification crawls), Vercel.

**Read first, every task:** `/PRODUCT.md`, `/DESIGN.md`, and the spec `docs/superpowers/specs/2026-07-16-v2-b2b-platform-design.md`. DESIGN.md's bans are hard rules (no side-stripe borders, no gradient text, no modal-first, no em dashes in copy).

**Working dir for all commands:** `~/Projects/lapeptides-portal-v2/sales-portal`

**Per-task verification standard (applies to EVERY task, in addition to task-specific checks):**
```bash
npm run typecheck && npm run test && npm run build
```
All three must pass before commit. UI tasks additionally run the Playwright crawl (Task 1 installs it) against `npm run dev` for the routes they touched and require zero console errors / zero "Application error" text.

---

## File structure decisions

- New design tokens live in `tailwind.config.ts` under `lap.*` (LA Peptides light system). The legacy `brand.*` (navy) tokens REMAIN until Task 10 removes them, so unmigrated pages keep rendering during the rebuild.
- New shell: `src/components/shell/` (AppSidebar, TopBar, MobileNav, PageHeader).
- Order Mode: `src/app/(portal)/order/page.tsx` + `src/components/order/` (CustomerChip, CustomerDrawer, PriceListChip, SearchOverlay, CategoryChips, ProductRail, ProductCard, CartPanel, PooledTierBar). Order-mode client state in `src/components/order/OrderModeProvider.tsx` (React context wrapping the existing `clientPreview.ts` helpers).
- CRM data: `src/lib/data/activities.ts`, `src/lib/data/tasks.ts`, `src/lib/data/leads.ts`, `src/lib/data/reorderRadar.ts`; actions: `src/lib/actions/activity-actions.ts`, `task-actions.ts`, `lead-actions.ts`; validation: `src/lib/validation/crm.ts`.
- Dashboard tabs: `src/app/(portal)/dashboard/page.tsx` (Home) + `sales/`, `engagement/`, `tasks/`, `leads/` subroutes sharing `src/components/dashboard/DashboardTabs.tsx`.
- Customer 360: `src/app/(portal)/customers/[id]/page.tsx` rebuilt + `src/components/customers/Customer360*.tsx`.

## Task 0: Preflight

- [ ] `git -C ~/Projects/lapeptides-portal-v2 status --short` must be clean and on `redesign/v2`. If not, stop and report.
- [ ] `npm run test` green (46+ pricing tests). Record the count; it may never decrease.

### Task 1: Design tokens, fonts, and the new app shell

**Files:**
- Modify: `tailwind.config.ts` (add `lap` namespace + fonts + shadows)
- Modify: `src/app/globals.css` (page background, selection color)
- Modify: `src/app/layout.tsx` (next/font: Inter, Outfit, JetBrains Mono -> CSS vars)
- Create: `src/components/shell/AppSidebar.tsx`, `TopBar.tsx`, `MobileNav.tsx`, `PageHeader.tsx`, `navItems.ts`
- Replace: `src/app/(portal)/layout.tsx`
- Create: `scripts/crawl.mjs` (Playwright verification crawl, adapted from the pattern in the session scratchpad: login as admin + rep, visit every route, capture pageerror/console-error, assert no "Application error")
- Dev-dep: `npm i -D playwright && npx playwright install chromium`

- [ ] **Step 1: Add tokens.** In `tailwind.config.ts` `theme.extend.colors`, ADD (do not remove `brand`):

```ts
lap: {
  ink: "#0F1B1F",
  slate: "#4A5862",
  page: "#F5FAFB",
  surface: "#FFFFFF",
  border: "#D3DFE2",
  teal: { DEFAULT: "#0C535E", dark: "#073841", bright: "#0DA5BC", wash: "#E8F4F6" },
  amber: "#F2A03D",
  green: "#2D8A5F",
  red: "#C9492A",
},
```

and `fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"], heading: ["var(--font-outfit)", "var(--font-inter)", "sans-serif"], mono: ["var(--font-jbmono)", "ui-monospace", "monospace"] }`, `boxShadow: { lap: "0 1px 2px rgb(12 83 94 / 0.06)", lapDrawer: "0 8px 30px rgb(7 56 65 / 0.18)" }`.

- [ ] **Step 2: Fonts.** In `src/app/layout.tsx` load `Inter`, `Outfit`, `JetBrains_Mono` from `next/font/google` with `variable: "--font-inter" | "--font-outfit" | "--font-jbmono"`, put all three variables on `<html>`, set `<body className="bg-lap-page text-lap-ink font-sans">`.
- [ ] **Step 3: Shell.** `navItems.ts` exports `{ href, label, icon, adminOnly? }[]`: Dashboard `/dashboard`, Order Mode `/order`, Quotes `/quotes`, Invoices `/invoices`, Customers `/customers`, Products `/products`, Reports `/reports` (adminOnly), Pricing `/pricing` (adminOnly), Settings `/settings` (adminOnly), Account `/account`. AppSidebar: fixed left rail `bg-lap-teal-dark text-white`, width 64px icons-only < xl, 232px with labels >= xl; active item = `bg-white/10` pill with `text-lap-teal-bright` icon. TopBar: breadcrumb from pathname, user name/role, sign-out. MobileNav: bottom tab bar (Dashboard, Order, Quotes, Customers, More sheet) visible < md; sidebar hidden < md. New `(portal)/layout.tsx` composes Sidebar + TopBar + `<main className="flex-1 px-4 md:px-8 py-6 max-w-[1400px]">`. Keep `requireUser()` exactly as before. Inline SVG icons (stroke 1.75) in a local `icons.tsx`; no icon library dependency.
- [ ] **Step 4: Crawl script.** `scripts/crawl.mjs` reads `CRAWL_BASE` env (default `http://localhost:3000`), logs in as `uniquesalesinc@gmail.com` / `ChangeMe123!` (admin) and `spencer@demo.lapeptides.net` (rep), visits every nav route + `/quotes/new`, fails process (exit 1) on any pageerror/console error/"Application error" text. Mirror the selectors from the proven crawler; keep it under 120 lines.
- [ ] **Step 5: Verify.** `npm run typecheck && npm run test && npm run build`; then `npm run dev &` + `node scripts/crawl.mjs`; expect old pages render (dark cards on light canvas is EXPECTED mid-migration) with zero errors.
- [ ] **Step 6: Commit** `feat(v2): LA Peptides light design tokens, fonts, sidebar app shell`.

### Task 2: Additive CRM schema migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260716120000_crm_phase1/migration.sql` (hand-written, additive only)
- Modify: `prisma/seed.ts` is NOT rerun; instead create `scripts/backfill-crm.mjs` if needed (it is not: all new columns have defaults or are nullable)

- [ ] **Step 1: Schema.** Add enums `PaymentTerms { PIA NET15 NET30 NET60 }`, `LeadStatusCustomer { LEAD ACTIVE DORMANT }`, `ActivityType { CALL EMAIL VISIT MEETING NOTE }`, `TaskPriority { LOW MEDIUM HIGH }`, `TaskStatus { OPEN DONE CANCELLED }`, `TaskSource { MANUAL REORDER_RADAR ABANDONED_CART }`, `LeadSource { MANUAL WEBSITE }`, `LeadReviewStatus { OPEN APPROVED REJECTED }`, `PortalUserStatus { PENDING_INVITE INVITED ACTIVE DISABLED }`. On `Customer` add: `defaultPriceListCode PriceListCode @default(BULK_RETAIL)`, `paymentTerms PaymentTerms @default(PIA)`, `crmStatus LeadStatusCustomer @default(ACTIVE)`, `billingAddress String?`, `shippingAddress String?`. On `Invoice` add `dueDate DateTime?`. New models `Activity`, `Task`, `Lead`, `PortalUser` exactly per spec section 6 (all FKs `onDelete: SetNull` except Activity/Task customer links which cascade; `PortalUser.email @unique`; index `Activity(customerId, occurredAt)`, `Task(assigneeId, status, dueDate)`, `Lead(status, createdAt)`).
- [ ] **Step 2: Migration SQL.** Hand-write CREATE TYPE / ALTER TABLE ADD COLUMN / CREATE TABLE / CREATE INDEX statements matching Step 1 (follow the style of `prisma/migrations/20260716010000_variant_costs/migration.sql`). No DROP/ALTER of existing columns anywhere.
- [ ] **Step 3: Apply.** `npx prisma migrate deploy` (uses DIRECT_URL) then `npx prisma generate`.
- [ ] **Step 4: Verify additive safety.** Run the v1 smoke: `curl -sf https://lapeptides-portal.vercel.app/login >/dev/null && echo v1-ok`. Then `npm run typecheck && npm run test && npm run build`.
- [ ] **Step 5: Commit** `feat(v2): additive CRM schema (activities, tasks, leads, portal users, customer terms)`.

### Task 3: CRM data layer + server actions (TDD)

**Files:**
- Create: `src/lib/validation/crm.ts`, `src/lib/data/activities.ts`, `src/lib/data/tasks.ts`, `src/lib/data/leads.ts`, `src/lib/actions/activity-actions.ts`, `src/lib/actions/task-actions.ts`, `src/lib/actions/lead-actions.ts`
- Test: `src/lib/data/leads.test.ts` (pure logic only; DB functions are thin Prisma wrappers)

- [ ] **Step 1: Failing tests** for the two pure functions in `leads.ts`:

```ts
import { describe, expect, it } from "vitest";
import { matchLeadType, leadDecisionPatch } from "./leads";

describe("matchLeadType", () => {
  it("flags existing customer by email domain+company match", () => {
    const existing = [{ id: "c1", email: "front@scottsdalewell.com", businessName: "Scottsdale Wellness" }];
    expect(matchLeadType({ email: "owner@scottsdalewell.com", company: "Scottsdale Wellness" }, existing)).toEqual({ type: "EXISTING", matchedCustomerId: "c1" });
  });
  it("returns NEW when nothing matches", () => {
    expect(matchLeadType({ email: "a@b.com", company: "Nope" }, [])).toEqual({ type: "NEW", matchedCustomerId: null });
  });
});

describe("leadDecisionPatch", () => {
  it("APPROVED requires a customerId and stamps reviewer", () => {
    const p = leadDecisionPatch({ decision: "APPROVED", customerId: "c9", reviewerId: "u1", now: new Date("2026-07-16T12:00:00Z") });
    expect(p).toMatchObject({ status: "APPROVED", createdCustomerId: "c9", reviewedById: "u1" });
    expect(p.reviewedAt.toISOString()).toBe("2026-07-16T12:00:00.000Z");
  });
  it("REJECTED never carries a customerId", () => {
    expect(leadDecisionPatch({ decision: "REJECTED", reviewerId: "u1", now: new Date() }).createdCustomerId).toBeNull();
  });
});
```

- [ ] **Step 2: Run** `npm run test -- leads` -> FAIL (module not found).
- [ ] **Step 3: Implement.** `leads.ts`: the two pure functions + Prisma wrappers `listLeads(status?)`, `createLead(input)`, `approveLead({leadId, assignRepId, priceListCode, paymentTerms, existingCustomerId?})` (transaction: create Customer unless linking existing; update Lead via `leadDecisionPatch`), `rejectLead(leadId, reviewerId)`. `activities.ts`: `logActivity`, `listActivities({customerId? , sinceDays?})`, `activityCountsByType(range)` vs previous range. `tasks.ts`: `createTask`, `completeTask`, `listTasks({assigneeId?, status?})`, `taskCounts`. All action files: zod-validated inputs from `validation/crm.ts`, `requireUser()` for activities/tasks, `requireAdmin()` for lead decisions, `revalidatePath` the dashboard routes. Approve/reject lead calls the existing `src/lib/email.ts` wrapper (honest `sent:false` without key).
- [ ] **Step 4: Verify** `npm run test` (all green), `npm run typecheck && npm run build`.
- [ ] **Step 5: Commit** `feat(v2): CRM data layer - activities, tasks, leads with approval flow`.

### Task 4: Order Mode - customer context + browse surface

**Files:**
- Create: `src/app/(portal)/order/page.tsx` (server: loads catalog via `getWizardCatalog`, customers list, recent orders per customer)
- Create: `src/components/order/OrderModeProvider.tsx`, `CustomerChip.tsx`, `CustomerDrawer.tsx`, `PriceListChip.tsx`, `SearchOverlay.tsx`, `CategoryChips.tsx`, `ProductRail.tsx`, `ProductCard.tsx`
- Modify: `src/components/shell/navItems.ts` already points at `/order` (Task 1)
- Test: `src/components/order/orderMode.test.ts` (reducer logic)

- [ ] **Step 1: State design + failing tests.** `OrderModeProvider` holds `{ customer: CustomerSummary | null, priceListCode: QuoteLadderCode, overridden: boolean, cart: CartLine[] }` with a pure reducer in `orderMode.ts`. Tests: selecting a customer sets `priceListCode` from `customer.defaultPriceListCode` and `overridden=false`; manual ladder change sets `overridden=true`; `SET_CUSTOMER` reprices the cart via `repriceCart` (import from `@/lib/pricing/clientPreview`); `ADD_LINE`/`SET_QTY` route through `repriceCart` so pooling holds (reuse the scenarios from `engine.test.ts` mix-and-match cases with 2 injectables crossing a tier boundary).
- [ ] **Step 2: Run tests** -> FAIL, then implement reducer -> PASS.
- [ ] **Step 3: UI.** CustomerChip in the Order Mode header (`Guest ▾` when null). CustomerDrawer: right slide-over (`shadow-lapDrawer`), search input, list rows (name, city, order count), "Add new customer" inline expanding form reusing `customer-actions.ts` create action, Guest row. PriceListChip: shows `Bulk Retail (20-99 bottles)` / `Bulk Wholesale (100+ bottles)` labels from `PRICE_LIST_LABELS`, amber "overridden" dot + word when overridden. SearchOverlay: opens from TopBar search or `/` key, client-side filter over catalog entries (name + SKU), rows show name/size/mono price, Enter adds tier-1 qty... no: Enter opens product card focus; explicit Add buttons only. CategoryChips: the 7 categories from `CATEGORY_LABELS` + All. ProductRail: horizontal scroll rails "Previously purchased" (selected customer's order lines, server-provided), "Most ordered", "Trending this quarter" (server aggregates in `src/lib/data/catalog.ts`, add `getOrderRails()` there). ProductCard: per DESIGN.md signature patterns; tier ladder table highlights the tier the POOLED quantity qualifies (reuse the highlight logic pattern from `src/components/quotes/steps/ProductsStep.tsx`, which stays untouched for the legacy wizard).
- [ ] **Step 4: Verify** typecheck/test/build + crawl (`/order` both roles): zero errors; add-to-cart from card updates cart badge.
- [ ] **Step 5: Commit** `feat(v2): Order Mode - customer drawer, ladder chip, browse surface with rails`.

### Task 5: Order Mode - cart, pooled tier bar, create quote/order

**Files:**
- Create: `src/components/order/CartPanel.tsx`, `PooledTierBar.tsx`, `CartLineRow.tsx`
- Modify: `src/app/(portal)/order/page.tsx` (mount CartPanel as right rail xl+, bottom sheet below)
- Reuse: `src/lib/actions/quote-actions.ts` `createQuote` unchanged

- [ ] **Step 1: CartLineRow**: name+size, qty stepper (44px touch), mono unit price + line total, tier chip ("T3 - pooled"), MOQ warning state (amber) when under floor, line note toggle-input, discount input honoring the rep's `discountLimitPercent` (over-limit shows amber "Needs management approval" chip; existing validation path unchanged).
- [ ] **Step 2: PooledTierBar**: horizontal band strip of the active ladder's tiers (mono labels), fill proportional to pooled injectable quantity, active band `bg-lap-teal-wash` + `text-lap-teal`; caption "Pooled quantity: N bottles - every injectable line prices at Tier X". Capsule-exempt note appears only when a capsule line exists.
- [ ] **Step 3: Totals + submit.** Totals panel (subtotal, discounts, total, deposit line from existing logic, terms line "Net 30 - due [date]" using customer.paymentTerms + `date-fns`). Buttons: Create quote / Create order -> call `createQuote` with the existing payload shape (priceListCode = context ladder; wizard remains the fallback path at `/quotes/new` untouched). Success -> redirect to quote detail.
- [ ] **Step 4: Verify** typecheck/test/build; crawl; manual flow via Playwright script: pick customer, add 2 injectables crossing a tier boundary, assert displayed unit prices equal `engine.test.ts` expected values for the pooled tier; create quote as rep; assert quote appears at `/quotes`.
- [ ] **Step 5: Commit** `feat(v2): Order Mode cart with pooled tier bar and quote/order creation`.

### Task 6: Product detail page

**Files:**
- Create: `src/app/(portal)/products/[id]/page.tsx` + `src/components/catalog/ProductDetail.tsx`
- Modify: product links in ProductCard/SearchOverlay point here

- [ ] **Step 1:** Server page loads product + variants + tier entries (existing `catalog.ts` helpers; add `getProductDetail(id)` if absent). Renders: name (font-heading), category dot, size variant chips (selected = teal wash), full tier band grid in mono with active pooled band highlighted when arriving from Order Mode (`?qty=` + context), RUO line per DESIGN.md, "Other sizes" + "Same category" rails, Add-to-cart stepper bound to OrderModeProvider (page lives inside the provider scope; if entered without a customer, adding prompts the CustomerDrawer first).
- [ ] **Step 2: Verify** typecheck/test/build + crawl `/products/[first-id]`.
- [ ] **Step 3: Commit** `feat(v2): product detail page with tier grid, variants, RUO line`.

### Task 7: Customer 360

**Files:**
- Rebuild: `src/app/(portal)/customers/[id]/page.tsx`
- Create: `src/components/customers/CustomerFacts.tsx`, `CustomerStats.tsx`, `CustomerHistoryTabs.tsx`, `CustomerAdminControls.tsx`
- Modify: `src/lib/data/customers.ts` add `getCustomer360(id)` (facts + aggregates + recent orders/quotes/invoices/activities/tasks in one query set)
- Modify: `src/lib/actions/customer-actions.ts` add `updateCustomerCommercials` (admin-only: defaultPriceListCode, paymentTerms, assigned rep, crmStatus, addresses)

- [ ] **Step 1:** Layout: facts panel left (xl: 320px col; stacked on mobile), stats row (revenue, orders, quotes, open drafts - Outfit numerals, NOT the hero-metric template: numbers sit inside the same table-card as their trend context), tabs Orders | Quotes | Invoices | Activity | Tasks (server-rendered tables reusing existing list row components where they exist). Log-activity and add-task inline forms (drawer, not modal) on their tabs. Admin-only CustomerAdminControls: price list select, terms select, rep select, status select -> `updateCustomerCommercials` (server verifies ADMIN; non-admin render = read-only facts).
- [ ] **Step 2: Verify** typecheck/test/build; crawl as rep (controls hidden, page clean) and admin (controls save + revalidate).
- [ ] **Step 3: Commit** `feat(v2): Customer 360 with commercial controls and history tabs`.

### Task 8: Dashboard - Home / Sales / Engagement / Tasks / Leads + reorder radar

**Files:**
- Rebuild: `src/app/(portal)/dashboard/page.tsx` (Home) + create `dashboard/sales/page.tsx`, `dashboard/engagement/page.tsx`, `dashboard/tasks/page.tsx`, `dashboard/leads/page.tsx`
- Create: `src/components/dashboard/DashboardTabs.tsx`, `KpiRow.tsx`, `RecentColumns.tsx`, `ReorderRadar.tsx`, `EngagementStats.tsx`, `TaskBoard.tsx`, `LeadsInbox.tsx`, `LeadDrawer.tsx`
- Create: `src/lib/data/reorderRadar.ts` + Test: `src/lib/data/reorderRadar.test.ts`
- Modify: `src/lib/data/dashboard.ts` extend aggregates (this-vs-last-month)

- [ ] **Step 1: Reorder radar TDD.** Pure function `computeReorderDue(customers: { id; name; orderDates: Date[] }[], now: Date)`: customers with >= 3 orders whose median gap between consecutive orders has elapsed since the last order get `{ customerId, medianGapDays, daysSinceLast, overdueBy }`, sorted by overdueBy desc. Tests: median of [30,34,26] gaps -> 30; customer 40 days since last -> overdueBy 10; < 3 orders excluded; future-dated noise ignored. FAIL -> implement -> PASS.
- [ ] **Step 2: Home.** KPI row scoped by role (rep = own), Recent columns (orders / activity feed / quotes), ReorderRadar card listing due customers with "Create follow-up task" button -> `task-actions.createTask({source: "REORDER_RADAR"})`.
- [ ] **Step 3: Sales tab.** This month vs last: revenue, confirmed orders, drafts; admin gets per-rep table (reuse `reports.ts` aggregates where possible).
- [ ] **Step 4: Engagement tab.** `activityCountsByType` this-vs-previous with delta chips (amber down / green up), activity timeline (customer link, rep, note), upcoming tasks list.
- [ ] **Step 5: Tasks tab.** Counts (open/overdue/done this month), list grouped Open -> Overdue emphasized (`text-lap-red` date), complete/cancel inline, quick-add form, admin assignee select.
- [ ] **Step 6: Leads tab (admin route guard).** LeadsInbox table (status chip amber Open / green Approved / red Rejected, type badge New vs Existing via `matchLeadType` against customers), manual "Add lead" inline form. LeadDrawer: details, existing-customer match banner with link action, Approve form (rep select, price list select, terms select) -> `approveLead`, Reject -> `rejectLead`.
- [ ] **Step 7: Verify** typecheck/test/build; crawl all five tabs both roles (rep gets 307 or hidden Leads); commit `feat(v2): CRM dashboard - home, sales, engagement, tasks, leads inbox, reorder radar`.

### Task 9: Reports rebuild (admin)

**Files:**
- Rebuild: `src/app/(portal)/reports/page.tsx` + create `reports/customers/page.tsx`, `reports/products/page.tsx`, `reports/team/page.tsx`
- Create: `src/components/reports/ReportTabs.tsx`, `FilterChips.tsx`, `LeaderboardTable.tsx`
- Modify: `src/lib/data/reports.ts` add `salesReport(filters)`, `customerLeaderboard(filters)`, `productLeaderboard(filters)`, `teamLeaderboard(filters)`; filters = `{ from?, to?, customerId?, repId?, priceListCode? }` via searchParams

- [ ] **Step 1:** Sales: confirmed amount/count, AOV, quote conversion (accepted/total), monthly summary table with inline bar spans (`bg-lap-teal-wash` width-proportional, mono values). Customers: leaderboard w/ last order + avg reorder days (reuse `reorderRadar` median helper). Products: top sellers by qty/revenue/distinct customers with sort toggle. Team: rep rows - confirmed orders, revenue, conversion, discount requests vs approvals.
- [ ] **Step 2: Verify** typecheck/test/build; crawl `/reports/*` admin (rep 307s); commit `feat(v2): admin reports - sales, customers, products, team leaderboards`.

### Task 10: Full retheme sweep + legacy token removal + live deploy

**Files:**
- Restyle in place: `/quotes` list + `[id]` detail, `/quotes/new` wizard, `/invoices` list + detail, `/customers` list, `/products` list, `/account`, `/settings`, `/reps`, `/pricing` pages, `/login`, PDF button surfaces (PDF templates themselves unchanged this phase)
- Modify: `tailwind.config.ts` (delete `brand.*` after the last `brand-` class is gone)
- Modify: `src/components/nav/BottomNav.tsx` deleted in favor of shell MobileNav (Task 1) if not already

- [ ] **Step 1:** Sweep: `grep -rn "brand-" src/ --include="*.tsx" | cut -d: -f1 | sort -u` and restyle each file to `lap-*` tokens per DESIGN.md (tables: `bg-lap-surface` cards, `border-lap-border` hairlines, mono money columns, status chips amber/green/red). No layout rewrites beyond what restyling requires; these pages get full UX passes later.
- [ ] **Step 2:** When grep returns zero files, delete the `brand` color block from `tailwind.config.ts`.
- [ ] **Step 3: Verify.** typecheck/test/build; FULL crawl (all routes, both roles, zero errors); visual smoke: screenshot `/dashboard`, `/order`, `/quotes`, a quote detail, `/reports` via Playwright to `scratchpad` for JJ's side-by-side.
- [ ] **Step 4: Deploy.** `vercel --prod --yes` (project `lapeptides-portal-v2`), then run `scripts/crawl.mjs` with `CRAWL_BASE=https://lapeptides-portal-v2.vercel.app`; verify v1 (`lapeptides-portal.vercel.app`) still loads and logs in.
- [ ] **Step 5: Commit + push** `feat(v2): complete light-theme sweep, remove legacy navy tokens` and report both URLs.

## Plan self-review (done at write time)
- Spec coverage: shell (T1), schema (T2), CRM data (T3), Order Mode (T4-5), product detail (T6), Customer 360 (T7), dashboard/CRM/leads/radar (T8), reports (T9), retheme+deploy (T10). Phase 2/3 items in spec are explicitly out of this plan.
- Placeholders: none; every step names exact files, functions, and checks.
- Type consistency: `QuoteLadderCode` from `wizard-types.ts`; `PRICE_LIST_LABELS`/`CATEGORY_LABELS` from `lib/data/catalog.ts`; `repriceCart` from `lib/pricing/clientPreview.ts`; enums match spec section 6 and Task 2 schema.
