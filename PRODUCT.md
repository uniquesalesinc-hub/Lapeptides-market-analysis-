# PRODUCT.md - LA Peptides Sales Platform (v2)

register: product

## What this is
A B2B wholesale platform for LA Peptides research peptides, modeled on WizCommerce's
WizOrder/WizShop pattern but wearing LA Peptides' brand. Three surfaces on one backend:

1. **Rep app (Order Mode)** - field sales reps quoting and ordering inside medical offices,
   usually on a phone or tablet, mid-conversation with a buyer.
2. **Admin dashboard + CRM** - management (JJ, director) tracking pipeline, rep performance,
   leads, follow-up tasks, reorder timing, and admin-only hard costs/margins.
3. **Client portal (Phase 2)** - approved wholesale buyers (med spas, clinics, research
   buyers) logging in to a branded storefront to browse, see THEIR pricing, and reorder.

## Users
- **Sales reps** (Danny, Spencer, Justus): fast product lookup, customer-aware pricing,
  quote/order/invoice creation, discounts capped by their personal limit (over-limit
  requires management approval). They must NEVER see hard costs.
- **Admin/management**: everything reps see, plus costs & margins, discount approvals,
  lead approvals, reports, user management.
- **Clients (Phase 2)**: browse catalog publicly, prices gated behind login, order
  self-serve; orders land in an admin approval queue.

## Non-negotiable business rules
- Uploaded wholesale pricing sheets are the source of truth. Never invent, estimate,
  or alter a price. Missing data is flagged, not guessed.
- Discounts require management approval when they exceed a rep's limit. No self-serve
  coupon codes.
- Hard costs (COGS) are admin-only, enforced server-side, never serialized to rep sessions.
- Every surface preserves RUO compliance language: "For research purposes only - not for
  human consumption." No medical claims, ever. Client checkout requires a recorded RUO
  acknowledgment.
- Track who sold what: every quote/order/invoice carries its rep.
- Two pricing ladders (Bulk Retail / Bulk Wholesale) assigned per customer; sprays,
  creams, capsules are flat-price at any quantity; injectable tiers pool across the
  quote (capsules exempt).

## Tone
Scientific, precise, confident. Lab-grade trust, not consumer-supplement hype.
Copy is direct and unhedged. No em dashes anywhere.

## Anti-references
- Generic shadcn/SaaS admin gray-on-white sameness.
- WizCommerce's own green/purple skin (we copy their UX patterns, never their look).
- Consumer supplement-store aesthetics (glossy lifestyle imagery, discount-mania).
- Anything that reads "crypto dashboard" or "AI-generated template."

## Strategic principles
- The rep in the room is the primary user: speed-to-price beats feature density.
- Admin views optimize for "who needs my attention today" (approvals, follow-ups,
  reorders due), not vanity metrics.
- One design system across all three surfaces; the client storefront is a warmer,
  simpler expression of the same brand, not a different product.
