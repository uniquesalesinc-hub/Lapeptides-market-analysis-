"use client";

import { formatMoney, formatDate } from "@/lib/format";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import type { QuoteTotals } from "@/lib/pricing/engine";
import type { CartLine, CustomerOption, WizardAdjustment } from "../wizard-types";
import type { PriceListCode } from "@prisma/client";

export function ReviewStep({
  customer,
  priceListCode,
  cart,
  adjustments,
  totals,
  depositPercent,
  expirationDate,
  paymentTerms,
  customerFacingNotes,
  internalNotes,
  termsAndConditions,
  quoteNumber,
  saving,
  onSaveDraft,
  onSend,
}: {
  customer: CustomerOption;
  priceListCode: PriceListCode;
  cart: CartLine[];
  adjustments: WizardAdjustment[];
  totals: QuoteTotals;
  depositPercent: number | null;
  expirationDate: string;
  paymentTerms: string;
  customerFacingNotes: string;
  internalNotes: string;
  termsAndConditions: string;
  quoteNumber: string | null;
  saving: boolean;
  onSaveDraft: () => void;
  onSend: () => void;
}) {
  const hasInvalidLines = cart.some((l) => !l.pricing.qualifies);

  return (
    <div className="space-y-4">
      {quoteNumber && (
        <p className="font-mono text-sm text-brand-slate-400">
          Draft saved as <span className="text-white">{quoteNumber}</span>
        </p>
      )}

      <div className="card p-4">
        <h2 className="font-semibold text-white">{customer.businessName}</h2>
        <p className="text-sm text-brand-slate-400">{customer.contactName}</p>
        <p className="mt-2 text-xs text-brand-slate-400">
          Priced against: {PRICE_LIST_LABELS[priceListCode]}
        </p>
      </div>

      {hasInvalidLines && (
        <p className="rounded-lg border border-brand-danger/40 bg-brand-danger/10 px-3 py-2 text-sm text-brand-danger">
          One or more line items are below the required minimum quantity and will not be
          included in the total until corrected. This quote cannot be sent until they qualify.
        </p>
      )}

      <div className="card divide-y divide-brand-border p-4">
        {cart.map((line) => (
          <div key={line.variantId} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-medium text-white">
                {line.productName} {line.strength}
              </p>
              <p className="text-xs text-brand-slate-400">
                {line.quantity} × {line.pricing.qualifies ? formatMoney(line.pricing.unitPrice!) : "—"} ·{" "}
                {line.pricing.qualifies ? line.pricing.appliedTier?.label : "below minimum"}
              </p>
            </div>
            <p className="font-semibold text-white">{line.pricing.qualifies ? formatMoney(line.pricing.lineTotal!) : "—"}</p>
          </div>
        ))}
      </div>

      <div className="card space-y-1.5 p-4 text-sm">
        <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
        {adjustments.map((a) => (
          <Row
            key={a.id}
            label={a.label}
            value={`${totals.resolvedAdjustments.find((r) => r.label === a.label)?.amount! >= 0 ? "+" : ""}${formatMoney(
              totals.resolvedAdjustments.find((r) => r.label === a.label)?.amount ?? 0
            )}`}
          />
        ))}
        <div className="border-t border-brand-border pt-1.5">
          <Row label="Total" value={formatMoney(totals.grandTotal)} bold />
        </div>
        {depositPercent != null && depositPercent > 0 && (
          <>
            <Row label={`Deposit required (${depositPercent}%)`} value={formatMoney(totals.depositAmount)} />
            <Row label="Remaining balance" value={formatMoney(totals.remainingBalance)} />
          </>
        )}
      </div>

      <div className="card space-y-1 p-4 text-sm text-brand-slate-300">
        <p>Payment terms: {paymentTerms}</p>
        <p>Expires: {formatDate(expirationDate)}</p>
        {customerFacingNotes && <p>Notes: {customerFacingNotes}</p>}
      </div>

      {internalNotes && (
        <div className="card border-brand-warning/30 p-4 text-sm">
          <p className="label-text !mb-1">Internal notes (not shown to customer)</p>
          <p className="text-brand-slate-300">{internalNotes}</p>
        </div>
      )}

      {termsAndConditions && (
        <div className="card p-4 text-xs text-brand-slate-400">
          <p className="label-text !mb-1">Terms &amp; Conditions</p>
          <p>{termsAndConditions}</p>
        </div>
      )}

      <div className="sticky bottom-24 space-y-2">
        <button type="button" className="btn-secondary w-full" onClick={onSaveDraft} disabled={saving}>
          {saving ? "Saving…" : "Save as Draft"}
        </button>
        <button type="button" className="btn-primary w-full" onClick={onSend} disabled={saving || hasInvalidLines}>
          {saving ? "Sending…" : "Send Quote to Customer"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-white" : "text-brand-slate-300"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
