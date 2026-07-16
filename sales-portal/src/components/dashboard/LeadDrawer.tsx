"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveLeadAction, rejectLeadAction } from "@/lib/actions/lead-actions";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { PAYMENT_TERMS_VALUES } from "@/lib/data/leads";
import { formatDateTime } from "@/lib/format";
import { Drawer, Field, inputClass } from "@/components/ui/drawer";
import { Chip } from "@/components/customers/chips";

const LADDER_OPTIONS = ["BULK_RETAIL", "BULK_WHOLESALE"] as const;

export interface LeadInboxRow {
  id: string;
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string;
  status: string;
  createdAt: Date;
  match: { customerId: string; name: string } | null;
  createdCustomer: { id: string; businessName: string } | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
}

export function LeadStatusChip({ status }: { status: string }) {
  if (status === "OPEN") return <Chip tone="amber">Open, awaiting review</Chip>;
  if (status === "APPROVED") return <Chip tone="green">Approved</Chip>;
  if (status === "REJECTED") return <Chip tone="red">Rejected</Chip>;
  return <Chip tone="slate">{status}</Chip>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-lap-slate">{label}</p>
      <div className="min-w-0 text-right text-sm text-lap-ink">{value}</div>
    </div>
  );
}

/**
 * Lead review drawer: full details, existing-customer match banner with a link-instead
 * toggle, and the approve (rep + price list + terms) / reject decision forms.
 */
export function LeadDrawer({
  lead,
  reps,
  open,
  onClose,
}: {
  lead: LeadInboxRow | null;
  reps: Array<{ id: string; name: string }>;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [linkExisting, setLinkExisting] = useState(false);

  if (!lead) return null;

  function approve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await approveLeadAction({
        leadId: lead.id,
        assignRepId: String(form.get("assignRepId") ?? ""),
        priceListCode: String(form.get("priceListCode") ?? ""),
        paymentTerms: String(form.get("paymentTerms") ?? ""),
        existingCustomerId: linkExisting && lead.match ? lead.match.customerId : undefined,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not approve the lead.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  function reject() {
    if (!lead) return;
    setError(null);
    startTransition(async () => {
      const result = await rejectLeadAction({ leadId: lead.id });
      if (!result.ok) {
        setError(result.error ?? "Could not reject the lead.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Drawer open={open} onClose={onClose} title={lead.company}>
      <div className="p-4">
        <div className="mb-2">
          <LeadStatusChip status={lead.status} />
        </div>
        <div className="divide-y divide-lap-border">
          <DetailRow label="Contact" value={`${lead.firstName} ${lead.lastName}`.trim()} />
          <DetailRow label="Email" value={lead.email} />
          {lead.phone && <DetailRow label="Phone" value={lead.phone} />}
          <DetailRow label="Source" value={lead.source === "WEBSITE" ? "Website" : "Manual"} />
          <DetailRow label="Received" value={formatDateTime(lead.createdAt)} />
          {lead.message && (
            <div className="py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-lap-slate">Message</p>
              <p className="mt-1 text-sm text-lap-ink">{lead.message}</p>
            </div>
          )}
        </div>

        {lead.status === "OPEN" ? (
          <div className="mt-4 space-y-4">
            {lead.match && (
              <div className="rounded-[10px] border border-lap-amber/40 bg-lap-amber/10 p-3">
                <p className="text-sm font-medium text-[#9A6318]">
                  Matches existing customer{" "}
                  <Link
                    href={`/customers/${lead.match.customerId}`}
                    className="underline underline-offset-2"
                  >
                    {lead.match.name}
                  </Link>
                </p>
                <label className="mt-2 flex items-center gap-2 text-sm text-lap-ink">
                  <input
                    type="checkbox"
                    checked={linkExisting}
                    onChange={(e) => setLinkExisting(e.target.checked)}
                    className="h-4 w-4 accent-lap-teal"
                  />
                  Link this lead to the existing account instead of creating a new customer
                </label>
                {linkExisting && (
                  <p className="mt-1 text-xs text-lap-slate">
                    The existing account keeps its current rep, price list, and terms.
                  </p>
                )}
              </div>
            )}

            <form onSubmit={approve} className="space-y-4">
              <Field label="Assign representative">
                <select name="assignRepId" required className={inputClass} defaultValue={reps[0]?.id ?? ""}>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Price list">
                <select name="priceListCode" required className={inputClass} defaultValue="BULK_RETAIL">
                  {LADDER_OPTIONS.map((code) => (
                    <option key={code} value={code}>
                      {PRICE_LIST_LABELS[code]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment terms">
                <select name="paymentTerms" required className={inputClass} defaultValue="Prepaid">
                  {PAYMENT_TERMS_VALUES.map((terms) => (
                    <option key={terms} value={terms}>
                      {terms}
                    </option>
                  ))}
                </select>
              </Field>

              {error && (
                <p className="rounded-lg bg-lap-red/10 px-3 py-2 text-xs font-medium text-lap-red" role="alert">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-touch flex-1 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending
                    ? "Working..."
                    : linkExisting && lead.match
                      ? "Approve and link"
                      : "Approve and create customer"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={reject}
                  className="min-h-touch rounded-[10px] border border-lap-red px-4 text-sm font-semibold text-lap-red transition-colors duration-150 hover:bg-lap-red/10 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mt-4 space-y-2 rounded-[10px] border border-lap-border bg-lap-page p-3">
            <p className="text-sm text-lap-ink">
              Reviewed by {lead.reviewedByName ?? "unknown"}
              {lead.reviewedAt ? ` on ${formatDateTime(lead.reviewedAt)}` : ""}.
            </p>
            {lead.createdCustomer && (
              <p className="text-sm text-lap-ink">
                Customer:{" "}
                <Link href={`/customers/${lead.createdCustomer.id}`} className="text-lap-teal hover:underline">
                  {lead.createdCustomer.businessName}
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
