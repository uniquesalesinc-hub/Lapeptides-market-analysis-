"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/lib/actions/invoice-actions";

export function InvoicePaymentForm({ invoiceId, balanceDue }: { invoiceId: string; balanceDue: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const method = String(formData.get("method"));
    const referenceNote = String(formData.get("referenceNote") || "");
    const internalNote = String(formData.get("internalNote") || "");

    startTransition(async () => {
      const result = await recordPayment(invoiceId, {
        amount,
        method: method as never,
        referenceNote,
        internalNote,
      });
      if (!result.ok) {
        setError(result.message ?? "Could not record payment.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary w-full" onClick={() => setOpen(true)}>
        Record Payment
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-4">
      <h2 className="font-semibold text-white">Record a payment</h2>
      <div>
        <label className="label-text">Amount</label>
        <input
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          max={balanceDue}
          defaultValue={balanceDue}
          required
          className="input-field"
        />
      </div>
      <div>
        <label className="label-text">Method</label>
        <select name="method" className="input-field">
          <option value="ACH">ACH</option>
          <option value="WIRE">Wire</option>
          <option value="CREDIT_CARD">Credit card</option>
          <option value="CHECK">Check</option>
          <option value="CASH">Cash</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div>
        <label className="label-text">Reference (optional)</label>
        <input name="referenceNote" className="input-field" placeholder="Transaction ID, check #, etc." />
      </div>
      <div>
        <label className="label-text">Internal note (optional)</label>
        <textarea name="internalNote" rows={2} className="input-field !h-auto py-2" />
      </div>
      {error && <p className="text-sm text-brand-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={pending}>
          {pending ? "Saving…" : "Save Payment"}
        </button>
      </div>
    </form>
  );
}
