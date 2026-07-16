"use client";

import { useState } from "react";
import { authorizeDiscount } from "@/lib/pricing/engine";
import { formatMoney } from "@/lib/format";
import { ADJUSTMENT_LABELS, type WizardAdjustment } from "../wizard-types";

const KIND_OPTIONS = Object.keys(ADJUSTMENT_LABELS) as WizardAdjustment["kind"][];
const DISCOUNT_KINDS = new Set(["CUSTOMER_DISCOUNT", "REP_DISCOUNT"]);

export function ChargesStep({
  adjustments,
  setAdjustments,
  depositPercent,
  setDepositPercent,
  expirationDate,
  setExpirationDate,
  paymentTerms,
  setPaymentTerms,
  customerFacingNotes,
  setCustomerFacingNotes,
  internalNotes,
  setInternalNotes,
  repDiscountLimitPercent,
  subtotal,
  onContinue,
}: {
  adjustments: WizardAdjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<WizardAdjustment[]>>;
  depositPercent: number | null;
  setDepositPercent: (v: number | null) => void;
  expirationDate: string;
  setExpirationDate: (v: string) => void;
  paymentTerms: string;
  setPaymentTerms: (v: string) => void;
  customerFacingNotes: string;
  setCustomerFacingNotes: (v: string) => void;
  internalNotes: string;
  setInternalNotes: (v: string) => void;
  repDiscountLimitPercent: number;
  subtotal: number;
  onContinue: () => void;
}) {
  const [kind, setKind] = useState<WizardAdjustment["kind"]>("SHIPPING");
  const [label, setLabel] = useState("");
  const [valueType, setValueType] = useState<"PERCENT" | "FIXED_AMOUNT">("FIXED_AMOUNT");
  const [value, setValue] = useState("");

  function addAdjustment() {
    const numValue = Number(value);
    if (!numValue || numValue < 0) return;
    setAdjustments((prev) => [
      ...prev,
      { id: crypto.randomUUID(), kind, label: label || ADJUSTMENT_LABELS[kind], valueType, value: numValue },
    ]);
    setLabel("");
    setValue("");
  }

  function removeAdjustment(id: string) {
    setAdjustments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <h2 className="font-semibold text-white">Add a charge or discount</h2>
        <div>
          <label className="label-text">Type</label>
          <select className="input-field" value={kind} onChange={(e) => setKind(e.target.value as WizardAdjustment["kind"])}>
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {ADJUSTMENT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-text">Label (optional)</label>
          <input className="input-field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={ADJUSTMENT_LABELS[kind]} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Value type</label>
            <select className="input-field" value={valueType} onChange={(e) => setValueType(e.target.value as "PERCENT" | "FIXED_AMOUNT")}>
              <option value="FIXED_AMOUNT">Fixed amount ($)</option>
              <option value="PERCENT">Percent (%)</option>
            </select>
          </div>
          <div>
            <label className="label-text">Value</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className="input-field"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>
        {DISCOUNT_KINDS.has(kind) && value && (
          <DiscountLimitPreview
            kind={kind}
            valueType={valueType}
            value={Number(value)}
            subtotal={subtotal}
            limit={repDiscountLimitPercent}
          />
        )}
        <button type="button" className="btn-secondary w-full" onClick={addAdjustment} disabled={!value}>
          Add
        </button>
      </div>

      {adjustments.length > 0 && (
        <div className="card p-4">
          <h2 className="mb-2 font-semibold text-white">Applied charges</h2>
          <ul className="divide-y divide-brand-border">
            {adjustments.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-white">{a.label}</p>
                  <p className="text-xs text-brand-slate-400">
                    {a.valueType === "PERCENT" ? `${a.value}%` : formatMoney(a.value)}
                  </p>
                </div>
                <button type="button" className="text-sm text-brand-danger" onClick={() => removeAdjustment(a.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card space-y-3 p-4">
        <h2 className="font-semibold text-white">Deposit & Terms</h2>
        <div>
          <label className="label-text">Deposit required (% of total)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            className="input-field"
            value={depositPercent ?? ""}
            onChange={(e) => setDepositPercent(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
        <div>
          <label className="label-text">Payment terms</label>
          <select className="input-field" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
            <option value="Prepaid">Prepaid</option>
            <option value="Net 15">Net 15</option>
            <option value="Net 30">Net 30</option>
          </select>
        </div>
        <div>
          <label className="label-text">Quote expires</label>
          <input
            type="date"
            className="input-field"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
          />
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <div>
          <label className="label-text">Customer-facing notes</label>
          <textarea
            className="input-field !h-auto py-2"
            rows={2}
            value={customerFacingNotes}
            onChange={(e) => setCustomerFacingNotes(e.target.value)}
          />
        </div>
        <div>
          <label className="label-text">Internal notes (never shown to the customer)</label>
          <textarea
            className="input-field !h-auto py-2"
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
        </div>
      </div>

      <button type="button" className="btn-primary w-full" onClick={onContinue}>
        Review Quote
      </button>
    </div>
  );
}

function DiscountLimitPreview({
  kind,
  valueType,
  value,
  subtotal,
  limit,
}: {
  kind: WizardAdjustment["kind"];
  valueType: "PERCENT" | "FIXED_AMOUNT";
  value: number;
  subtotal: number;
  limit: number;
}) {
  const auth = authorizeDiscount({ kind, label: "", valueType, value }, subtotal, limit);
  if (auth.authorized) return null;
  return (
    <p className="rounded-lg border border-brand-warning/40 bg-brand-warning/10 px-3 py-2 text-xs text-brand-warning">
      {auth.reason}
    </p>
  );
}
