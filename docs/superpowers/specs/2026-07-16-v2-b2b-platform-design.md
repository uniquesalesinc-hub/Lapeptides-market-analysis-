# LA Peptides Sales Platform v2 - Design Spec

Date: 2026-07-16. Approved direction: JJ, from WizCommerce WizOrder/WizShop reference
(8 screenshot batches + demo transcript, 7/16/2026). Branding: lapeptides.net via
PRODUCT.md / DESIGN.md in this repo.

Built ONLY on the `redesign/v2` branch / `lapeptides-portal-v2` Vercel project.
The original portal (lapeptides-portal.vercel.app) stays frozen for side-by-side
comparison. Shared Supabase database; all schema changes must be additive.

## Phasing

- **Phase 1 (now): rep Order Mode + admin dashboard/CRM.** Full UI rebuild in the
  LA Peptides B2B design system, plus new CRM data (activities, tasks, leads).
- **Phase 2: client portal.** Branded storefront, price-gated login, self-serve
  orders into an approval queue. Depends on Phase 1's per-customer price list,
  portal-user model, leads inbox, and Resend email.
- **Phase 3: payments.** ACH/Zelle capture, payment links, upcoming-payments view.
  Depends on payment terms metadata built in Phase 1.

Everything below the Phase 1 heading is in scope NOW; Phases 2-3 sections record
decisions already made so nothing is relearned later.

---

## Phase 1 scope

### 1. App shell
- Deep-teal icon sidebar (Dashboard, Order Mode, Quotes, Orders/Invoices, Customers,
  Reports [admin], Pricing [admin], Settings), collapsible to icons on desktop,
  bottom-tab or sheet nav on mobile.
- Top bar: breadcrumb, global search, notification bell (approval requests for
  admin; approval outcomes for reps), avatar menu.
- All existing routes keep working during the rebuild; pages are restyled/replaced
  incrementally but every deploy stays fully functional.

### 2. Order Mode (replaces the step wizard as the primary flow)
- Persistent **customer chip** in the header. Tap -> right slide-over drawer:
  searchable customer list (name, city filter), "Add new customer" inline form,
  or "Guest / no customer" browsing. Selecting a customer loads their price list,
  terms, and history into the session.
- Persistent **price list chip**: auto-set from the customer's assigned ladder;
  manual override allowed (exception path) with a visible "overridden" state.
- **Product browsing home**: live search-as-you-type overlay (name/SKU, client-side
  over ~110 SKUs), category chips (Peptides, GLP, Blends, Bio Regulators, Sprays,
  Creams, Capsules), rails: "Previously purchased" (selected customer), "Most
  ordered" (all-time, from order data), "Trending this quarter."
- **Product cards**: name, size badges, category dot, current-ladder price, MOQ,
  compact tier ladder with the active (pooled) tier highlighted, last-order info
  for the selected customer ("2 @ $110 on Apr 29"), qty stepper + add.
- **Product detail page**: size variant chips, full tier band grid (mono type,
  active band highlighted), pooled-quantity explanation line, RUO line, same-product
  other sizes + same-category rail ("similar products", deterministic).
- **Cart**: right rail on desktop, full page on mobile. Line rows: qty stepper,
  unit price, line total (mono), MOQ/tier state, line note, line discount entry
  (rep-limit rules unchanged: over-limit -> flagged, quote blocked until ADMIN
  approves). Pooled tier bar showing combined injectable quantity and the active
  tier for the pool. Totals panel -> **Create quote** or **Create order** (order =
  quote auto-accepted, existing model). Deposit/terms display from customer record.
- Pricing engine, pooling rules, flat spray/cream/capsule pricing, discount
  approval flow: REUSED UNCHANGED from the existing lib (`src/lib/pricing`,
  quote actions). UI-only rebuild on top.

### 3. Customer 360
- Route: `/customers/[id]`. Left facts panel: customer ID, assigned price list,
  assigned rep, contacts, addresses (billing/shipping), payment terms, lead status.
- Analytics cards: total revenue, orders, quotes, open drafts (computed from
  existing tables).
- Tabs: Orders | Quotes | Invoices | Activity | Tasks. Tables reuse the list views.
- Admin-only extras on this page: change price list assignment, change rep,
  edit terms. (Cost/margin stays on the existing admin pricing pages.)

### 4. Dashboard (tabs: Home / Sales / Engagement / Tasks / Leads)
- **Home**: KPI row (booked revenue, orders, open quotes awaiting approval, drafts;
  admin sees all, rep sees own), three columns: recent orders, activity feed,
  recent quotes. "Reorder radar" card: customers whose median reorder gap has
  elapsed (computed from order history), one-click "create follow-up task."
- **Sales**: this month vs last (revenue, orders, drafts) with by-rep breakdown
  (admin) / own numbers (rep).
- **Engagement**: activity metrics vs previous month (calls, emails, visits,
  meetings), timeline of logged activities, upcoming scheduled follow-ups.
- **Tasks**: open/overdue/completed counts; task list w/ priority, due date,
  customer link, assignee (admin can assign to any rep). Quick-add.
- **Leads** (admin): inbox table (status Open/Approved/Rejected, type New vs
  Existing-match by email/company, source, created). Row -> drawer: lead details,
  "Is this an existing customer? -> link", Approve & Create Customer (assign rep +
  price list + terms at approval), or Reject. Approval/rejection emails go out
  when RESEND_API_KEY exists; otherwise recorded with `sent:false` (existing
  honest-email pattern).

### 5. Reports (admin-only, tabs: Sales / Customers / Products / Team)
- Filter chips: time range, customer, rep, price list.
- Sales: confirmed order amount/count, average order value, quote conversion,
  order summary by month table.
- Customers: leaderboard (order count/amount, last order, avg reorder days).
- Products: top sellers by qty / revenue / distinct customers.
- Team: rep leaderboard (confirmed orders, revenue, quote conversion, discounts
  requested/approved). Fulfills director requirement #9 visibly.

### 6. Data model additions (one additive migration)
- `Customer`: `defaultPriceListCode` and `paymentTerms` ALREADY EXIST in the
  live schema as TEXT (values 'BULK_RETAIL'/'BULK_WHOLESALE' and 'Prepaid'/
  'Net 15'/'Net 30'/'Net 60' parsed by `lib/invoiceTerms.computeDueDate`);
  v2 reuses both as-is (amended 7/16 after migration review - no retyping of
  live columns). New: `crmStatus` (LEAD | ACTIVE | DORMANT, default ACTIVE),
  billing/shipping address fields (nullable strings).
- `Activity`: id, type (CALL | EMAIL | VISIT | MEETING | NOTE), customerId,
  userId, occurredAt, note.
- `Task`: id, title, note?, customerId?, assigneeId, creatorId, dueDate,
  priority (LOW | MEDIUM | HIGH), status (OPEN | DONE | CANCELLED), source
  (MANUAL | REORDER_RADAR | ABANDONED_CART), completedAt?.
- `Lead`: id, company, firstName, lastName, email, phone?, message?, source
  (MANUAL | WEBSITE), status (OPEN | APPROVED | REJECTED), matchedCustomerId?,
  createdCustomerId?, reviewedById?, reviewedAt?.
- `PortalUser` (Phase 2 uses it; created now so the model is stable): id,
  customerId, name, email (unique), passwordHash?, status (PENDING_INVITE |
  INVITED | ACTIVE | DISABLED), invitedAt?, lastLoginAt?, lastActiveAt?.
- `Invoice`: `dueDate` computed from customer terms at creation.
- Existing `User.role` stays (SALES_REP | ADMIN). Client logins use PortalUser,
  NOT User: separate auth surface, impossible to leak rep/admin routes.

### 7. Explicitly out of scope (all phases unless re-decided)
AI copilot ("Kai"), image/barcode search, offline mode, ERP sync, multiple named
carts, wishlists, claims, per-customer SKU visibility, coupon/promo codes,
storefront theme picker, credential-swap impersonation (Addendum A adds a
cookie-scoped admin view-as instead), WordPress/page builder.

---

## Phase 2 decisions on record (client portal)
- Branded storefront (lapeptides.net look, warmer expression of same system):
  top category nav, hero, product grid; public browsing with prices hidden ->
  "Login to view pricing."
- PortalUser login (separate NextAuth credentials provider or scoped session),
  per-customer pricing everywhere, persistent server-side cart, line notes,
  one-click reorder from order history, recently-viewed rail.
- Checkout: Shipping -> Review -> Place Order; saved addresses; REQUIRED RUO
  acknowledgment checkbox recorded with timestamp on the order; confirmation
  page w/ order number, PDF download, re-order button.
- Client orders enter status PENDING_APPROVAL; admin/rep approve -> confirmed
  (notification email).
- Admin: Customers area tabs Customers | Leads | Portal Users (invite lifecycle
  PENDING_INVITE -> INVITED -> ACTIVE, resend invite, disable, last login/active
  columns); "Open client carts" view (cart owner, value, contents drawer,
  "create follow-up task" action).
- "Sign up" on the storefront files a Lead (source WEBSITE) into the Phase 1 inbox.
- Depends on Resend email being live.

## Phase 3 decisions on record (payments)
- Methods: ACH (processor TBD, likely Stripe ACH), Zelle instructions, payment
  links. Card-on-file/authorize only if a processor makes it trivial.
- Payment records against invoices; upcoming-payments view (due dates from terms);
  partial payments and refunds recorded.
- Invoice payment instructions block (already exists) gains per-method detail.

## Verification standard (every Phase 1 task)
- `npm run build` clean; pricing test suite still green (46+ tests, untouched
  engine); Playwright crawl (scratchpad browser-check pattern) shows zero
  console/page errors for admin + rep on all routes; rep session gets 307 from
  admin-only routes; live deploy to lapeptides-portal-v2.vercel.app verified
  logged-in before reporting done.

---

## Addendum A (7/16, JJ + Spencer field call): Phase 1.5 - admin enhancements

1. **Sub-MOQ ordering.** Bulk Retail Tier 1 floor drops 20 -> 5 for ALL products
   (Spencer: "order less than 20... from five to 20 under bulk retail tier number
   one"). Quantities 5-19 price at the T1 sheet price; below 5 stays unpriced.
   Wholesale bands unchanged (band 1 already covers 1-99). This is a deliberate
   business override of the printed sheets, same provenance class as the flat
   spray/cream rule. Tier data lives in the shared DB, so the rule applies to
   BOTH portals once the data migration runs.
2. **Brand kit per customer.** Customer 360 gains a Brand tab: sections Logo /
   Social media / Vial labels / Other; upload PNG/JPEG/PDF/SVG (<= 8 MB), stored
   in Postgres (BrandAsset model with bytea), served via authenticated route;
   uploaded by reps or admin; delete allowed (admin or uploader). Structured
   brand details on the customer: primaryHex, secondaryHex, accentHex, fontNotes,
   brandNotes - exact hex values to stop color drift in label/logo production.
   Purpose: Danny's print staff pulls one folder per customer; label template has
   4 fixed layers + editable layer 5 (peptide name + mg).
3. **Admin view switching.** Sidebar becomes sectioned for admins: collapsible
   "Admin view" (the admin nav), "Sales rep view" (list of reps; selecting one
   enters viewing-as mode: dashboards/quotes/customers/order-mode data scoped to
   that rep, persistent banner "Viewing as [rep] - Exit"), "Customer view" (list
   of customers; opens their Customer 360 now, becomes their portal view when the
   client portal ships). Mechanism: signed viewAs cookie honored ONLY for ADMIN
   sessions; never a credential swap; all writes still audit as the admin.
4. Client portal (Phase 2) additionally gains: reorder from history (already
   specced) + brand info upload by the customer themselves.
