import type { Customer, User } from "@prisma/client";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { formatDate } from "@/lib/format";
import { CrmStatusChip } from "./chips";

type FactsCustomer = Customer & { assignedRep: Pick<User, "id" | "name"> };

/** One structured address group flattened to a display line; the freeform CRM field wins. */
function addressLine(
  freeform: string | null,
  parts: Array<string | null | undefined>
): string | null {
  if (freeform?.trim()) return freeform.trim();
  const composed = parts.filter((p) => p?.trim()).join(", ");
  return composed || null;
}

function FactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-lap-slate">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-lap-ink">{children}</dd>
    </div>
  );
}

/**
 * Customer 360 facts panel: identity, lifecycle status, commercial settings, contact,
 * and addresses. Left column at xl, stacked above the history on smaller screens.
 */
export function CustomerFacts({ customer }: { customer: FactsCustomer }) {
  const billing = addressLine(customer.billingAddress, [
    customer.billingAddressLine1,
    customer.billingAddressLine2,
    customer.billingCity,
    customer.billingState,
    customer.billingPostalCode,
  ]);
  const shipping = customer.shippingSameAsBilling && !customer.shippingAddress
    ? billing
    : addressLine(customer.shippingAddress, [
        customer.shippingAddressLine1,
        customer.shippingAddressLine2,
        customer.shippingCity,
        customer.shippingState,
        customer.shippingPostalCode,
      ]);

  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface p-4 shadow-lap">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-lap-ink">Account</h2>
        <CrmStatusChip status={customer.crmStatus} />
      </div>
      <p className="mt-1 break-all font-mono text-xs text-lap-slate">{customer.id}</p>

      <dl className="mt-3 divide-y divide-lap-border border-t border-lap-border">
        <FactRow label="Price list">
          {PRICE_LIST_LABELS[customer.defaultPriceListCode as keyof typeof PRICE_LIST_LABELS] ??
            customer.defaultPriceListCode.replace(/_/g, " ")}
        </FactRow>
        <FactRow label="Terms">{customer.paymentTerms}</FactRow>
        <FactRow label="Rep">{customer.assignedRep.name}</FactRow>
        <FactRow label="Type">{customer.customerType.replace(/_/g, " ")}</FactRow>
        <FactRow label="Tax-exempt">{customer.taxExempt ? "Yes" : "No"}</FactRow>
        <FactRow label="Contact">{customer.contactName}</FactRow>
        {customer.email && (
          <FactRow label="Email">
            <span className="break-all">{customer.email}</span>
          </FactRow>
        )}
        {customer.phone && <FactRow label="Phone">{customer.phone}</FactRow>}
        <FactRow label="Last contact">{formatDate(customer.lastContactDate)}</FactRow>
        <FactRow label="Follow-up">
          <span className={customer.followUpDate ? "font-medium text-[#9A6318]" : ""}>
            {formatDate(customer.followUpDate)}
          </span>
        </FactRow>
      </dl>

      <div className="mt-3 space-y-3 border-t border-lap-border pt-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-lap-slate">Billing address</p>
          <p className="mt-0.5 text-sm text-lap-ink">{billing ?? "Not on file"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-lap-slate">Shipping address</p>
          <p className="mt-0.5 text-sm text-lap-ink">
            {shipping ?? "Not on file"}
            {customer.shippingSameAsBilling && !customer.shippingAddress && billing ? (
              <span className="text-lap-slate"> (same as billing)</span>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  );
}
