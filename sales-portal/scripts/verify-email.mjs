// One-shot email activation check. Run AFTER setting RESEND_API_KEY:
//   npx tsx scripts/verify-email.mjs you@example.com
// Uses the same env contract as src/lib/email.ts and diagnoses the two common
// failure modes precisely: missing key, and unverified sending domain.
import { Resend } from "resend";

const to = process.argv[2];
if (!to || !to.includes("@")) {
  console.error("Usage: npx tsx scripts/verify-email.mjs <recipient@example.com>");
  process.exit(1);
}
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("FAIL: RESEND_API_KEY is not set in this shell/.env. See docs/EMAIL_ACTIVATION.md step 2.");
  process.exit(1);
}
const from = process.env.EMAIL_FROM_ADDRESS || "LA Peptides Sales Portal <no-reply@lapeptides.net>";
console.log(`Sending test email  from: ${from}  to: ${to}`);
const resend = new Resend(apiKey);
const { data, error } = await resend.emails.send({
  from,
  to,
  subject: "LA Peptides portal email test",
  html: "<p>Email delivery from the LA Peptides Sales Platform is working.</p><p style=\"font-size:11px;color:#4A5862;text-transform:uppercase\">For research purposes only - not for human consumption.</p>",
});
if (error) {
  console.error("FAIL:", error.message ?? JSON.stringify(error));
  if (String(error.message ?? "").toLowerCase().includes("domain")) {
    console.error(
      "\nThis is the unverified-domain case. Two fixes (docs/EMAIL_ACTIVATION.md step 3):\n" +
        " a) Verify lapeptides.net in Resend (Domains -> Add -> add the DNS records), or\n" +
        ' b) For instant testing set EMAIL_FROM_ADDRESS="LA Peptides <onboarding@resend.dev>"'
    );
  }
  process.exit(1);
}
console.log("SUCCESS: sent. Resend id:", data?.id ?? "(no id returned)");
console.log("Now set the same two env vars on Vercel (see docs/EMAIL_ACTIVATION.md step 4) and redeploy.");
