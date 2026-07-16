"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPortalUserAction,
  disablePortalUserAction,
  enablePortalUserAction,
  resetPortalUserPasswordAction,
  sendPortalInviteAction,
} from "@/lib/actions/portal-user-actions";
import { formatDate, formatDateTime } from "@/lib/format";
import { PlusIcon } from "@/components/shell/icons";
import { Drawer, Field, inputClass } from "@/components/ui/drawer";
import { Chip, type ChipTone } from "@/components/customers/chips";

export interface PortalUserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  invitedAt: Date | null;
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  customer: { id: string; businessName: string };
}

const STATUS_CHIP: Record<string, { tone: ChipTone; label: string }> = {
  PENDING_INVITE: { tone: "amber", label: "Not invited" },
  INVITED: { tone: "teal", label: "Invited" },
  ACTIVE: { tone: "green", label: "Active" },
  DISABLED: { tone: "slate", label: "Disabled" },
};

export function PortalUserStatusChip({ status }: { status: string }) {
  const entry = STATUS_CHIP[status] ?? { tone: "slate" as ChipTone, label: status };
  return <Chip tone={entry.tone}>{entry.label}</Chip>;
}

const primaryButtonClass =
  "min-h-touch w-full rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "min-h-touch w-full rounded-[10px] border border-lap-border px-4 text-sm font-semibold text-lap-ink transition-colors duration-150 hover:bg-lap-page disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Admin portal-user management: table of client logins, add drawer, and a per-row drawer
 * with the invite / disable / enable / reset-password actions.
 */
export function PortalUsersManager({
  portalUsers,
  customers,
}: {
  portalUsers: PortalUserRow[];
  customers: Array<{ id: string; businessName: string }>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const selected = portalUsers.find((u) => u.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !portalUsers.some((u) => u.id === selectedId)) setSelectedId(null);
  }, [portalUsers, selectedId]);

  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lap-border px-4 py-3">
        <p className="text-sm text-lap-slate">
          Client logins for the wholesale storefront. Each login belongs to one customer account.
        </p>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark"
        >
          <PlusIcon className="h-4 w-4" />
          Add portal user
        </button>
      </div>

      {portalUsers.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-lap-slate">
          No portal users yet. Add one to give a wholesale buyer storefront access.
        </p>
      ) : (
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-lap-teal-wash text-left text-xs font-medium uppercase tracking-wide text-lap-slate">
                <th className="rounded-l-lg px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Invited</th>
                <th className="px-3 py-2">Last login</th>
                <th className="rounded-r-lg px-3 py-2">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lap-border">
              {portalUsers.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => setSelectedId(user.id)}
                  className="cursor-pointer transition-colors duration-150 hover:bg-lap-page"
                >
                  <td className="px-3 py-2.5 font-medium text-lap-ink">{user.name}</td>
                  <td className="px-3 py-2.5 text-lap-slate">{user.email}</td>
                  <td className="px-3 py-2.5 text-lap-slate">{user.customer.businessName}</td>
                  <td className="px-3 py-2.5">
                    <PortalUserStatusChip status={user.status} />
                  </td>
                  <td className="px-3 py-2.5 text-lap-slate">{user.invitedAt ? formatDate(user.invitedAt) : "Never"}</td>
                  <td className="px-3 py-2.5 text-lap-slate">{user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}</td>
                  <td className="px-3 py-2.5 text-lap-slate">{user.lastActiveAt ? formatDate(user.lastActiveAt) : "Never"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PortalUserDrawer
        key={selected?.id ?? "none"}
        portalUser={selected}
        open={selected !== null}
        onClose={() => setSelectedId(null)}
      />
      <AddPortalUserDrawer open={addOpen} onClose={() => setAddOpen(false)} customers={customers} />
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-lap-slate">{label}</p>
      <div className="min-w-0 text-right text-sm text-lap-ink">{value}</div>
    </div>
  );
}

function PortalUserDrawer({
  portalUser,
  open,
  onClose,
}: {
  portalUser: PortalUserRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  if (!portalUser) return null;

  function run(action: () => Promise<{ ok: boolean; error?: string; emailSent?: boolean }>, successNotice?: (result: { emailSent?: boolean }) => string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "The action failed. Please try again.");
        return;
      }
      if (successNotice) setNotice(successNotice(result));
      router.refresh();
    });
  }

  function submitReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!portalUser) return;
    const form = new FormData(event.currentTarget);
    run(
      () =>
        resetPortalUserPasswordAction({
          portalUserId: portalUser.id,
          password: String(form.get("password") ?? ""),
        }),
      () => "Password updated."
    );
    setResetOpen(false);
  }

  const canInvite = portalUser.status === "PENDING_INVITE" || portalUser.status === "INVITED";
  const isDisabled = portalUser.status === "DISABLED";

  return (
    <Drawer open={open} onClose={onClose} title={portalUser.name}>
      <div className="space-y-4 p-4">
        <div className="divide-y divide-lap-border rounded-[10px] border border-lap-border px-3">
          <DetailRow label="Status" value={<PortalUserStatusChip status={portalUser.status} />} />
          <DetailRow label="Email" value={portalUser.email} />
          <DetailRow
            label="Customer"
            value={
              <Link href={`/customers/${portalUser.customer.id}`} className="text-lap-teal hover:underline">
                {portalUser.customer.businessName}
              </Link>
            }
          />
          <DetailRow label="Invited" value={portalUser.invitedAt ? formatDateTime(portalUser.invitedAt) : "Never"} />
          <DetailRow label="Last login" value={portalUser.lastLoginAt ? formatDateTime(portalUser.lastLoginAt) : "Never"} />
          <DetailRow label="Last active" value={portalUser.lastActiveAt ? formatDateTime(portalUser.lastActiveAt) : "Never"} />
          <DetailRow label="Created" value={formatDate(portalUser.createdAt)} />
        </div>

        {error && (
          <p className="rounded-lg bg-lap-red/10 px-3 py-2 text-xs font-medium text-lap-red" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg bg-lap-teal-wash px-3 py-2 text-xs font-medium text-lap-teal" role="status">
            {notice}
          </p>
        )}

        <div className="space-y-2">
          {canInvite && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => sendPortalInviteAction({ portalUserId: portalUser.id }),
                  (result) =>
                    result.emailSent
                      ? "Invite sent."
                      : "Invite recorded. Email delivery is not configured yet, so share the login details directly."
                )
              }
              className={primaryButtonClass}
            >
              {pending ? "Working..." : portalUser.status === "INVITED" ? "Resend invite" : "Send invite"}
            </button>
          )}

          {!resetOpen ? (
            <button type="button" disabled={pending} onClick={() => setResetOpen(true)} className={secondaryButtonClass}>
              Reset password
            </button>
          ) : (
            <form onSubmit={submitReset} className="space-y-2 rounded-[10px] border border-lap-border p-3">
              <Field label="New password">
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setResetOpen(false)} className={secondaryButtonClass}>
                  Cancel
                </button>
                <button type="submit" disabled={pending} className={primaryButtonClass}>
                  {pending ? "Saving..." : "Set password"}
                </button>
              </div>
            </form>
          )}

          {isDisabled ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => enablePortalUserAction({ portalUserId: portalUser.id }), () => "Portal user enabled.")}
              className={secondaryButtonClass}
            >
              {pending ? "Working..." : "Enable login"}
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => disablePortalUserAction({ portalUserId: portalUser.id }), () => "Portal user disabled.")}
              className="min-h-touch w-full rounded-[10px] border border-lap-red/40 px-4 text-sm font-semibold text-lap-red transition-colors duration-150 hover:bg-lap-red/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Working..." : "Disable login"}
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function AddPortalUserDrawer({
  open,
  onClose,
  customers,
}: {
  open: boolean;
  onClose: () => void;
  customers: Array<{ id: string; businessName: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createPortalUserAction({
        customerId: String(form.get("customerId") ?? ""),
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      if (!result.ok) {
        setError(result.error ?? "Could not create the portal user.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add portal user">
      <form onSubmit={submit} className="space-y-4 p-4">
        <Field label="Customer">
          <select name="customerId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Select a customer
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <input name="name" required placeholder="Taylor Chen" className={inputClass} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required className={inputClass} />
        </Field>
        <Field label="Initial password (optional)">
          <input
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="Leave blank to invite later"
            className={inputClass}
          />
        </Field>
        <p className="text-xs text-lap-slate">
          With a password the login is active immediately. Left blank, the account is created as
          not invited and access starts when you send the invite or set a password.
        </p>
        {error && (
          <p className="rounded-lg bg-lap-red/10 px-3 py-2 text-xs font-medium text-lap-red" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Saving..." : "Create portal user"}
        </button>
      </form>
    </Drawer>
  );
}
