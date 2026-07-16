"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createCustomer, type CustomerActionResult } from "@/lib/actions/customer-actions";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { CloseIcon, PlusIcon, SearchIcon } from "@/components/shell/icons";
import type { QuoteLadderCode } from "@/components/quotes/wizard-types";
import { useOrderMode } from "./OrderModeProvider";
import type { OrderCustomer } from "./orderMode";

/**
 * Right slide-over for picking the customer context: search, Guest row, customer rows
 * (name / city / order count), and an inline-expanding "Add new customer" form that posts
 * to the existing createCustomer action and selects the new account on success.
 */
export function CustomerDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, customers, setCustomer } = useOrderMode();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setAdding(false);
    const t = window.setTimeout(() => searchRef.current?.focus(), 220);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.businessName.toLowerCase().includes(q) || (c.city ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

  function select(customer: OrderCustomer | null) {
    setCustomer(customer);
    onClose();
  }

  return (
    <div className={open ? "" : "pointer-events-none"} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-lap-teal-dark/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Select customer"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-lap-surface shadow-lapDrawer transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-lap-border px-4 py-3">
          <h2 className="font-heading text-lg font-semibold text-lap-ink">Customer</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-touch w-touch items-center justify-center rounded-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-lap-border p-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lap-slate" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or city"
              className="min-h-touch w-full rounded-[10px] border border-lap-border bg-lap-surface pl-9 pr-3 text-sm text-lap-ink placeholder:text-lap-slate/70 focus:border-lap-teal focus:outline-none focus:ring-2 focus:ring-lap-teal-bright/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Guest row */}
          <button
            type="button"
            onClick={() => select(null)}
            className={`flex min-h-touch w-full items-center justify-between gap-3 border-b border-lap-border px-4 py-3 text-left transition-colors duration-150 hover:bg-lap-page ${
              state.customer === null ? "bg-lap-teal-wash" : ""
            }`}
          >
            <span>
              <span className="block text-sm font-semibold text-lap-ink">Guest</span>
              <span className="block text-xs text-lap-slate">Browse without a customer</span>
            </span>
            {state.customer === null && (
              <span className="rounded-full bg-lap-teal px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Active
              </span>
            )}
          </button>

          {filtered.map((customer) => {
            const active = state.customer?.id === customer.id;
            return (
              <button
                key={customer.id}
                type="button"
                onClick={() => select(customer)}
                className={`flex min-h-touch w-full items-center justify-between gap-3 border-b border-lap-border px-4 py-3 text-left transition-colors duration-150 hover:bg-lap-page ${
                  active ? "bg-lap-teal-wash" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-lap-ink">{customer.businessName}</span>
                  <span className="block truncate text-xs text-lap-slate">
                    {customer.city ?? "No city on file"} · {PRICE_LIST_LABELS[customer.defaultPriceListCode]}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-lap-slate">
                  {customer.orderCount} {customer.orderCount === 1 ? "order" : "orders"}
                </span>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-lap-slate">
              {query.trim()
                ? `No customers match "${query}".`
                : "No customers on your book yet. Add one below."}
            </p>
          )}
        </div>

        {/* Inline-expanding add-new form (drawer expansion, never a modal) */}
        <div className="border-t border-lap-border">
          {adding ? (
            <NewCustomerForm onCancel={() => setAdding(false)} onDone={onClose} />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex min-h-touch w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-lap-teal transition-colors duration-150 hover:bg-lap-page"
            >
              <PlusIcon className="h-4 w-4" />
              Add new customer
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-touch flex-1 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create and select"}
    </button>
  );
}

function NewCustomerForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const { currentUserId, adoptNewCustomer } = useOrderMode();
  const [result, formAction] = useFormState(createCustomer, { ok: false } as CustomerActionResult);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const cityRef = useRef<string>("");
  const handledRef = useRef(false);

  useEffect(() => {
    if (!result.ok || !result.customer || handledRef.current) return;
    handledRef.current = true;
    const code = result.customer.defaultPriceListCode;
    adoptNewCustomer({
      id: result.customer.id,
      businessName: result.customer.businessName,
      city: cityRef.current || null,
      orderCount: 0,
      defaultPriceListCode: code === "BULK_WHOLESALE" ? "BULK_WHOLESALE" : "BULK_RETAIL",
    });
    onDone();
  }, [result, adoptNewCustomer, onDone]);

  const inputClass =
    "min-h-touch w-full rounded-[10px] border border-lap-border bg-lap-surface px-3 text-sm text-lap-ink placeholder:text-lap-slate/70 focus:border-lap-teal focus:outline-none focus:ring-2 focus:ring-lap-teal-bright/40";
  const labelClass = "mb-1 block text-xs font-semibold text-lap-slate";

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const data = new FormData(e.currentTarget);
        cityRef.current = String(data.get("billingCity") ?? "");
      }}
      className="max-h-[60dvh] space-y-3 overflow-y-auto p-4"
    >
      <p className="font-heading text-sm font-semibold text-lap-ink">New customer</p>

      {!result.ok && result.message && (
        <p className="rounded-lg bg-lap-amber/10 px-3 py-2 text-xs font-medium text-lap-ink">{result.message}</p>
      )}
      {result.duplicates && result.duplicates.length > 0 && (
        <div className="rounded-lg border border-lap-amber/50 bg-lap-amber/10 px-3 py-2 text-xs text-lap-ink">
          <p className="font-semibold">Possible existing accounts:</p>
          <ul className="mt-1 list-inside list-disc">
            {result.duplicates.map((d) => (
              <li key={d.id}>
                {d.businessName} {d.email ? `(${d.email})` : ""}
              </li>
            ))}
          </ul>
          <label className="mt-2 flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={confirmDuplicate}
              onChange={(e) => setConfirmDuplicate(e.target.checked)}
            />
            Create anyway - this is a different business
          </label>
        </div>
      )}
      <input type="hidden" name="confirmDuplicate" value={confirmDuplicate ? "true" : "false"} />
      <input type="hidden" name="assignedRepId" value={currentUserId} />

      <div>
        <label className={labelClass} htmlFor="order-new-businessName">
          Business name
        </label>
        <input id="order-new-businessName" name="businessName" required className={inputClass} />
        {result.fieldErrors?.businessName && (
          <p className="mt-1 text-xs text-lap-red">{result.fieldErrors.businessName}</p>
        )}
      </div>
      <div>
        <label className={labelClass} htmlFor="order-new-contactName">
          Contact name
        </label>
        <input id="order-new-contactName" name="contactName" required className={inputClass} />
        {result.fieldErrors?.contactName && (
          <p className="mt-1 text-xs text-lap-red">{result.fieldErrors.contactName}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="order-new-city">
            City
          </label>
          <input id="order-new-city" name="billingCity" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="order-new-type">
            Type
          </label>
          <select id="order-new-type" name="customerType" defaultValue="CLINIC" className={inputClass}>
            <option value="CLINIC">Clinic / med spa</option>
            <option value="RESELLER">Reseller</option>
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="INDIVIDUAL_PRACTITIONER">Individual practitioner</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="order-new-ladder">
          Price list
        </label>
        <select id="order-new-ladder" name="defaultPriceListCode" defaultValue="BULK_RETAIL" className={inputClass}>
          {(["BULK_RETAIL", "BULK_WHOLESALE"] as QuoteLadderCode[]).map((code) => (
            <option key={code} value={code}>
              {PRICE_LIST_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-1">
        <SubmitButton />
        <button
          type="button"
          onClick={onCancel}
          className="min-h-touch rounded-[10px] border border-lap-border px-4 text-sm font-semibold text-lap-slate transition-colors duration-150 hover:bg-lap-page"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
