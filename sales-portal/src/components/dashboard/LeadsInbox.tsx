"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createLeadAction } from "@/lib/actions/lead-actions";
import { formatDate } from "@/lib/format";
import { PlusIcon } from "@/components/shell/icons";
import { Drawer, Field, inputClass } from "@/components/ui/drawer";
import { Chip } from "@/components/customers/chips";
import { LeadDrawer, LeadStatusChip, type LeadInboxRow } from "./LeadDrawer";

const FILTERS = [
  { value: "", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
] as const;

/**
 * Admin leads inbox: filterable table, add-lead drawer, and the review drawer on row click.
 */
export function LeadsInbox({
  leads,
  reps,
  activeFilter,
}: {
  leads: LeadInboxRow[];
  reps: Array<{ id: string; name: string }>;
  activeFilter: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  // If a decided lead disappears from a filtered list after refresh, drop the selection.
  useEffect(() => {
    if (selectedId && !leads.some((l) => l.id === selectedId)) setSelectedId(null);
  }, [leads, selectedId]);

  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lap-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const active = activeFilter === f.value;
            return (
              <Link
                key={f.value}
                href={f.value ? `/dashboard/leads?status=${f.value}` : "/dashboard/leads"}
                className={`inline-flex min-h-touch items-center rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 ${
                  active
                    ? "border-lap-teal bg-lap-teal-wash text-lap-teal"
                    : "border-lap-border text-lap-slate hover:text-lap-ink"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark"
        >
          <PlusIcon className="h-4 w-4" />
          Add lead
        </button>
      </div>

      {leads.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-lap-slate">
          No leads {activeFilter ? "with this status" : "yet"}. Website requests and manual
          entries land here for review.
        </p>
      ) : (
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-lap-teal-wash text-left text-xs font-medium uppercase tracking-wide text-lap-slate">
                <th className="rounded-l-lg px-3 py-2">Company</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="rounded-r-lg px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lap-border">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedId(lead.id)}
                  className="cursor-pointer transition-colors duration-150 hover:bg-lap-page"
                >
                  <td className="px-3 py-2.5 font-medium text-lap-ink">{lead.company}</td>
                  <td className="px-3 py-2.5 text-lap-slate">
                    {`${lead.firstName} ${lead.lastName}`.trim()}
                  </td>
                  <td className="px-3 py-2.5 text-lap-slate">{lead.email}</td>
                  <td className="px-3 py-2.5">
                    {lead.match ? <Chip tone="teal">Existing</Chip> : <Chip tone="slate">New</Chip>}
                  </td>
                  <td className="px-3 py-2.5">
                    <LeadStatusChip status={lead.status} />
                  </td>
                  <td className="px-3 py-2.5 text-lap-slate">{formatDate(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LeadDrawer
        key={selected?.id ?? "none"}
        lead={selected}
        reps={reps}
        open={selected !== null}
        onClose={() => setSelectedId(null)}
      />
      <AddLeadDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </section>
  );
}

function AddLeadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createLeadAction({
        company: String(form.get("company") ?? ""),
        firstName: String(form.get("firstName") ?? ""),
        lastName: String(form.get("lastName") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? "") || undefined,
        message: String(form.get("message") ?? "") || undefined,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not create the lead.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add lead">
      <form onSubmit={submit} className="space-y-4 p-4">
        <Field label="Company">
          <input name="company" required placeholder="Scottsdale Wellness" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name">
            <input name="firstName" required className={inputClass} />
          </Field>
          <Field label="Last name">
            <input name="lastName" required className={inputClass} />
          </Field>
        </div>
        <Field label="Email">
          <input name="email" type="email" required className={inputClass} />
        </Field>
        <Field label="Phone (optional)">
          <input name="phone" className={inputClass} />
        </Field>
        <Field label="Message (optional)">
          <textarea name="message" rows={3} className={inputClass} />
        </Field>
        {error && (
          <p className="rounded-lg bg-lap-red/10 px-3 py-2 text-xs font-medium text-lap-red" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-touch w-full rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving..." : "Create lead"}
        </button>
      </form>
    </Drawer>
  );
}
