import { Resend } from "resend";

/**
 * Thin email-sending wrapper. Real delivery requires RESEND_API_KEY (see .env.example) — an
 * administrator must supply that credential. Without it, the app does NOT pretend to send mail:
 * it logs the message server-side and returns `sent: false` so callers (password reset, quote
 * send, invoice send) can surface an honest "email not configured" state instead of a false
 * success. This satisfies the "do not simulate delivery without approved credentials" rule
 * while keeping every call site already wired for real delivery the moment a key is added.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  sent: boolean;
  provider: "resend" | "none";
  error?: string;
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "LA Peptides Sales Portal <no-reply@lapeptides.net>";

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[email:not-configured] Would send to ${input.to} — subject: "${input.subject}". Set RESEND_API_KEY to enable real delivery.`
    );
    return { sent: false, provider: "none", error: "RESEND_API_KEY is not configured" };
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo,
    });
    return { sent: true, provider: "resend" };
  } catch (err) {
    console.error("[email:send-failed]", err);
    return { sent: false, provider: "resend", error: err instanceof Error ? err.message : "Unknown error" };
  }
}
