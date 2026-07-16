"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCustomerCommercials } from "@/lib/actions/customer-actions";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { PAYMENT_TERMS_VALUES } from "@/lib/data/leads";

const LADDER_OPTIONS = ["BULK_RETAIL", "BULK_WHOLESALE"] as const;
const CRM_STATUS_OPTIONS = [
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active" },
  { value: "DORMANT", label: "Dormant" },
] as const;

export interface CustomerAdminControlsProps {
  customer: {
    id: string;
    defaultPriceListCode: string;
    paymentTerms: string;
    assignedRepId: string;
    crmStatus: string;
    billingAddress: string | null;
    shippingAddress: string | null;
  };
  reps: Array<{ id: string; name: string }>;
}

/**
 * Admin-only commercial controls: price list, terms, rep, CRM status, freeform addresses.
 * The page only renders this for admins (decided server-side) and the action re-verifies
 * with requireAdmin, so a rep never sees or reaches this mutation path.
 */
export function CustomerAdminControls({ customer, reps }: CustomerAdminControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage(null);
    startTransition(async () => {
      const result = await updateCustomerCommercials({
        customerId: customer.id,
        defaultPriceListCode: form.get("defaultPriceListCode"),
        paymentTerms: form.get("paymentTerms"),
        assignedRepId: String(form.get("assignedRepId") ?? ""),
        crmStatus: form.get("crmStatus"),
        billingAddress: String(form.get("billingAddress") ?? ""),
        shippingAddress: String(form.get("shippingAddress") ?? ""),
      });
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error ?? "Could not save the commercial settings." });
        return;
      }
      setMessage({ tone: "ok", text: "Commercial settings saved." });
      router.refresh();
    });
  }

  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface p-4 shadow-lap">
      <h2 className="font-heading text-base font-semibold text-lap-ink">Commercial settings</h2>
      <p className="mt-0.5 text-xs text-lap-slate">Admin only. Changes apply to all future quotes.</p>

      <form onSubmit={submit} className="mt-3 space-y-3">
        <Field label="Price list">
          <select name="defaultPriceListCode" defaultValue={normalizeLadder(customer.defaultPriceListCode)} className={inputClass}>
            {LADDER_OPTIONS.map((code) => (
              <option key={code} value={code}>
                {PRICE_LIST_LABELS[code]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payment terms">
          <select name="paymentTerms" defaultValue={customer.paymentTerms} className={inputClass}>
            {PAYMENT_TERMS_VALUES.map((terms) => (
              <option key={terms} value={terms}>
                {terms}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Assigned rep">
          <select name="assignedRepId" defaultValue={customer.assignedRepId} className={inputClass}>
            {reps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="CRM status">
          <select name="crmStatus" defaultValue={customer.crmStatus} className={inputClass}>
            {CRM_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Billing address">
          <textarea
            name="billingAddress"
            rows={2}
            defaultValue={customer.billingAddress ?? ""}
            placeholder="Street, city, state, ZIP"
            className={inputClass}
          />
        </Field>
        <Field label="Shipping address">
          <textarea
            name="shippingAddress"
            rows={2}
            defaultValue={customer.shippingAddress ?? ""}
            placeholder="Leave blank if same as billing"
            className={inputClass}
          />
        </Field>

        {message && (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              message.tone === "error" ? "bg-lap-red/10 text-lap-red" : "bg-lap-green/10 text-lap-green"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="min-h-touch w-full rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save commercial settings"}
        </button>
      </form>
    </section>
  );
}

/** The TEXT column can hold legacy values; anything not the wholesale ladder edits as retail. */
function normalizeLadder(code: string): (typeof LADDER_OPTIONS)[number] {
  return code === "BULK_WHOLESALE" ? "BULK_WHOLESALE" : "BULK_RETAIL";
}

const inputClass =
  "min-h-touch w-full rounded-[10px] border border-lap-border bg-lap-surface px-3 py-2 text-sm text-lap-ink placeholder:text-lap-slate/70 focus:border-lap-teal focus:outline-none focus:ring-2 focus:ring-lap-teal-bright/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-lap-slate">{label}</span>
      {children}
    </label>
  );
}
