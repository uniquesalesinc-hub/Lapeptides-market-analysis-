"use client";

import type { WizardStep } from "./wizard-types";

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: "customer", label: "1. Customer" },
  { id: "products", label: "2. Products" },
  { id: "charges", label: "3. Charges" },
  { id: "review", label: "4. Review" },
];

export function StepTabs({
  current,
  onChange,
  canReview,
  canCharges,
}: {
  current: WizardStep;
  onChange: (step: WizardStep) => void;
  canReview: boolean;
  canCharges: boolean;
}) {
  return (
    <div className="table-scroll no-print">
      <div className="flex gap-2">
        {STEPS.map((s) => {
          const disabled = (s.id === "charges" && !canCharges) || (s.id === "review" && !canReview);
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(s.id)}
              className={`min-h-touch whitespace-nowrap rounded-full border px-4 text-sm font-semibold disabled:opacity-40 ${
                current === s.id
                  ? "border-brand-teal bg-brand-teal text-brand-navy"
                  : "border-brand-border bg-brand-surface text-brand-slate-300"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
