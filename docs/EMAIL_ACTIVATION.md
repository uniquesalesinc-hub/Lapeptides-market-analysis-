# Email activation runbook (10-15 minutes, one-time)

Everything in the platform is already wired for email (portal-user invites, lead
approve/reject notices, client-order notifications to reps, quote/invoice sends).
It all honestly records `sent:false` until the steps below are done. No code
changes are needed - only credentials and DNS.

## 1. Create the Resend account (JJ - requires login)
Go to https://resend.com -> sign up with uniquesalesinc@gmail.com (keep LA
Peptides accounts separate from ASAAR/Totem accounts). The free tier (100
emails/day) is plenty to start.

## 2. Create the API key
Resend dashboard -> API Keys -> Create ("lapeptides-portal", Full access).
Copy the `re_...` value. Locally, add to `sales-portal/.env`:

    RESEND_API_KEY="re_..."

## 3. Pick the sender (one of two)
- **Fast path (test immediately, no DNS):** also add
  `EMAIL_FROM_ADDRESS="LA Peptides <onboarding@resend.dev>"` - Resend's shared
  onboarding sender, works instantly, fine for demo-phase.
- **Real path (before clients see emails):** Resend -> Domains -> Add
  `lapeptides.net` -> add the DKIM/SPF DNS records it shows at the domain host
  -> wait for Verified. Then no EMAIL_FROM_ADDRESS is needed (the default
  `no-reply@lapeptides.net` sender starts working). Without this, sends from
  the default address are REJECTED even with a valid key.

## 4. Verify locally
    cd ~/Projects/lapeptides-portal-v2/sales-portal
    npx tsx scripts/verify-email.mjs jack.jj.gilmore@gmail.com
The script diagnoses missing-key and unverified-domain failures precisely.

## 5. Set the same vars on Vercel and redeploy
    cd ~/Projects/lapeptides-portal-v2/sales-portal
    vercel env add RESEND_API_KEY production        # paste the key
    vercel env add EMAIL_FROM_ADDRESS production    # only if using the fast path
    vercel --prod --yes

## 6. Prove it end to end
Send a portal-user invite from /customers/portal-users (or approve a test lead)
and confirm the email arrives. Done - every other email surface uses the same
wrapper and lights up with it.
