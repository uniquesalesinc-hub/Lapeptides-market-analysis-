"use client";

import { useState, useTransition } from "react";
import { submitQuoteApproval } from "@/lib/actions/public-quote-actions";

export function PublicApprovalForm({ token, approvalLanguage }: { token: string; approvalLanguage: string }) {
  const [decision, setDecision] = useState<"APPROVED" | "DECLINED" | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [billingConfirmed, setBillingConfirmed] = useState(false);
  const [shippingConfirmed, setShippingConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  if (result?.ok) {
    return (
      <div className="card border-brand-success/40 bg-brand-success/10 p-4 text-center">
        <p className="font-semibold text-brand-success">
          {decision === "APPROVED" ? "Quote approved. Thank you!" : "Quote declined."}
        </p>
        <p className="mt-1 text-sm text-brand-slate-300">Your sales representative has been notified.</p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!decision) return;
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await submitQuoteApproval({
        token,
        decision,
        respondentName: String(formData.get("respondentName") || ""),
        respondentTitle: String(formData.get("respondentTitle") || ""),
        comments: String(formData.get("comments") || ""),
        billingConfirmed,
        shippingConfirmed,
        termsAccepted,
      });
      setResult(res);
    });
  }

  return (
    <div className="card space-y-4 p-4">
      <h2 className="font-semibold text-white">Respond to this quote</h2>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDecision("APPROVED")}
          className={`min-h-touch rounded-lg border px-4 font-semibold ${
            decision === "APPROVED" ? "border-brand-success bg-brand-success/10 text-brand-success" : "border-brand-border text-brand-slate-300"
          }`}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setDecision("DECLINED")}
          className={`min-h-touch rounded-lg border px-4 font-semibold ${
            decision === "DECLINED" ? "border-brand-danger bg-brand-danger/10 text-brand-danger" : "border-brand-border text-brand-slate-300"
          }`}
        >
          Decline
        </button>
      </div>

      {decision && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label-text">Your name</label>
            <input name="respondentName" required className="input-field" />
          </div>
          <div>
            <label className="label-text">Title (optional)</label>
            <input name="respondentTitle" className="input-field" />
          </div>
          <div>
            <label className="label-text">Comments (optional)</label>
            <textarea name="comments" rows={3} className="input-field !h-auto py-2" />
          </div>

          {decision === "APPROVED" && (
            <div className="space-y-2 text-sm text-brand-slate-300">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0"
                  checked={billingConfirmed}
                  onChange={(e) => setBillingConfirmed(e.target.checked)}
                />
                I confirm the billing information on this quote is correct.
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0"
                  checked={shippingConfirmed}
                  onChange={(e) => setShippingConfirmed(e.target.checked)}
                />
                I confirm the shipping information on this quote is correct.
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  required
                />
                {approvalLanguage || "I accept the quoted pricing and terms."}
              </label>
            </div>
          )}

          {result && !result.ok && <p className="text-sm text-brand-danger">{result.message}</p>}

          <button
            type="submit"
            className={decision === "APPROVED" ? "btn-primary w-full" : "btn-danger w-full"}
            disabled={pending || (decision === "APPROVED" && !termsAccepted)}
          >
            {pending ? "Submitting…" : decision === "APPROVED" ? "Confirm Approval" : "Confirm Decline"}
          </button>
        </form>
      )}
    </div>
  );
}
