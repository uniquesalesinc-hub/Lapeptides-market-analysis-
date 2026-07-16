"use client";

import { useState } from "react";
import { createCustomer } from "@/lib/actions/customer-actions";
import type { CustomerOption } from "../wizard-types";

export function CustomerStep({
  customers,
  selectedCustomerId,
  onSelect,
}: {
  customers: CustomerOption[];
  selectedCustomerId: string | null;
  onSelect: (customer: CustomerOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"list" | "new" | "prospect">("list");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localCustomers, setLocalCustomers] = useState<CustomerOption[]>(customers);

  const filtered = localCustomers.filter((c) =>
    `${c.businessName} ${c.contactName}`.toLowerCase().includes(query.toLowerCase())
  );

  async function quickAdd(e: React.FormEvent<HTMLFormElement>, isProspect: boolean) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("customerType", "RESELLER");
    form.set("defaultPriceListCode", "BULK_RETAIL");
    form.set("paymentTerms", "Prepaid");
    if (isProspect) form.set("isProspect", "true");

    const result = await createCustomer({ ok: false }, form);
    setPending(false);
    if (!result.ok || !result.customer) {
      setError(result.message ?? "Could not create customer.");
      return;
    }
    const option: CustomerOption = {
      id: result.customer.id,
      businessName: result.customer.businessName,
      contactName: result.customer.contactName,
      email: result.customer.email,
      defaultPriceListCode: result.customer.defaultPriceListCode as CustomerOption["defaultPriceListCode"],
    };
    setLocalCustomers((prev) => [option, ...prev]);
    onSelect(option);
  }

  if (mode === "new" || mode === "prospect") {
    const isProspect = mode === "prospect";
    return (
      <div className="card space-y-4 p-4">
        <h2 className="font-semibold text-lap-ink">
          {isProspect ? "Continue with a temporary prospect" : "Add a new customer"}
        </h2>
        {isProspect && (
          <p className="text-sm text-lap-slate">
            Use this for a fast quote before the account is fully set up. You can fill in full
            details later from the customer record.
          </p>
        )}
        <form onSubmit={(e) => quickAdd(e, isProspect)} className="space-y-3">
          <div>
            <label className="label-text">Business name</label>
            <input name="businessName" required className="input-field" />
          </div>
          <div>
            <label className="label-text">Contact name</label>
            <input name="contactName" required className="input-field" />
          </div>
          {!isProspect && (
            <>
              <div>
                <label className="label-text">Email</label>
                <input name="email" type="email" inputMode="email" className="input-field" />
              </div>
              <div>
                <label className="label-text">Phone</label>
                <input name="phone" type="tel" inputMode="tel" className="input-field" />
              </div>
            </>
          )}
          {error && <p className="text-sm text-lap-red">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setMode("list")}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={pending}>
              {pending ? "Saving…" : isProspect ? "Continue" : "Add & continue"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        inputMode="search"
        placeholder="Search customers…"
        className="input-field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary" onClick={() => setMode("new")}>
          + New customer
        </button>
        <button type="button" className="btn-secondary" onClick={() => setMode("prospect")}>
          Temporary prospect
        </button>
      </div>

      <ul className="space-y-2">
        {filtered.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              className={`card flex w-full items-center justify-between p-3 text-left ${
                selectedCustomerId === c.id ? "border-lap-teal" : ""
              }`}
            >
              <div>
                <p className="font-semibold text-lap-ink">{c.businessName}</p>
                <p className="text-sm text-lap-slate">{c.contactName}</p>
              </div>
              <span className="text-xs text-lap-slate">{c.defaultPriceListCode.replace(/_/g, " ")}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-lap-slate">No customers match your search.</p>
        )}
      </ul>
    </div>
  );
}
