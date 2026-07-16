"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  Customer360Activity,
  Customer360Invoice,
  Customer360Quote,
  Customer360Task,
} from "@/lib/data/customers";
import { logActivityAction } from "@/lib/actions/activity-actions";
import { cancelTaskAction, completeTaskAction, createTaskAction } from "@/lib/actions/task-actions";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { CloseIcon, PlusIcon } from "@/components/shell/icons";
import { Chip, DocStatusChip, type ChipTone } from "./chips";

const TAB_KEYS = ["orders", "quotes", "invoices", "activity", "tasks"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "VISIT", label: "Visit" },
  { value: "MEETING", label: "Meeting" },
  { value: "NOTE", label: "Note" },
] as const;

const ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((t) => [t.value, t.label])
);

const PRIORITY_TONES: Record<string, ChipTone> = { HIGH: "red", MEDIUM: "amber", LOW: "slate" };

export interface CustomerHistoryTabsProps {
  customerId: string;
  isAdmin: boolean;
  currentUserId: string;
  reps: Array<{ id: string; name: string }>;
  orders: Customer360Quote[];
  quotes: Customer360Quote[];
  invoices: Customer360Invoice[];
  activities: Customer360Activity[];
  tasks: Customer360Task[];
}

/**
 * Customer 360 history: Orders | Quotes | Invoices | Activity | Tasks. Data arrives fully
 * resolved from the server page; the Activity and Tasks tabs add inline drawer forms
 * (drawers, not modals) that post to the existing Task-3 CRM actions and refresh the route.
 */
export function CustomerHistoryTabs(props: CustomerHistoryTabsProps) {
  const [tab, setTab] = useState<TabKey>("orders");

  const counts: Record<TabKey, number> = {
    orders: props.orders.length,
    quotes: props.quotes.length,
    invoices: props.invoices.length,
    activity: props.activities.length,
    tasks: props.tasks.length,
  };
  const labels: Record<TabKey, string> = {
    orders: "Orders",
    quotes: "Quotes",
    invoices: "Invoices",
    activity: "Activity",
    tasks: "Tasks",
  };

  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
      <div role="tablist" aria-label="Customer history" className="flex overflow-x-auto border-b border-lap-border">
        {TAB_KEYS.map((key) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`min-h-touch shrink-0 border-b-2 px-4 text-sm font-medium transition-colors duration-150 ${
                active
                  ? "border-lap-teal-bright bg-lap-teal-wash text-lap-teal"
                  : "border-transparent text-lap-slate hover:text-lap-ink"
              }`}
            >
              {labels[key]}
              <span className="ml-1.5 font-mono text-xs text-lap-slate">{counts[key]}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="p-4">
        {tab === "orders" && (
          <QuoteTable rows={props.orders} empty="No orders yet. Accepted quotes appear here." />
        )}
        {tab === "quotes" && <QuoteTable rows={props.quotes} empty="No quotes yet." />}
        {tab === "invoices" && <InvoiceTable rows={props.invoices} />}
        {tab === "activity" && <ActivityPanel customerId={props.customerId} activities={props.activities} />}
        {tab === "tasks" && (
          <TasksPanel
            customerId={props.customerId}
            tasks={props.tasks}
            isAdmin={props.isAdmin}
            currentUserId={props.currentUserId}
            reps={props.reps}
          />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-lap-slate">{children}</p>;
}

function QuoteTable({ rows, empty }: { rows: Customer360Quote[]; empty: string }) {
  if (rows.length === 0) return <EmptyRow>{empty}</EmptyRow>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-lap-teal-wash text-left text-xs font-medium uppercase tracking-wide text-lap-slate">
            <th className="rounded-l-lg px-3 py-2">Number</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Status</th>
            <th className="rounded-r-lg px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-lap-border">
          {rows.map((q) => (
            <tr key={q.id} className="transition-colors duration-150 hover:bg-lap-page">
              <td className="px-3 py-2.5">
                <Link href={`/quotes/${q.id}`} className="font-mono text-lap-teal hover:underline">
                  {q.quoteNumber}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-lap-slate">{formatDate(q.quoteDate)}</td>
              <td className="px-3 py-2.5">
                <DocStatusChip status={q.status} />
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-lap-ink">{formatMoney(q.grandTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceTable({ rows }: { rows: Customer360Invoice[] }) {
  if (rows.length === 0) return <EmptyRow>No invoices yet.</EmptyRow>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-lap-teal-wash text-left text-xs font-medium uppercase tracking-wide text-lap-slate">
            <th className="rounded-l-lg px-3 py-2">Number</th>
            <th className="px-3 py-2">Issued</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2">Status</th>
            <th className="rounded-r-lg px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-lap-border">
          {rows.map((inv) => (
            <tr key={inv.id} className="transition-colors duration-150 hover:bg-lap-page">
              <td className="px-3 py-2.5">
                <Link href={`/invoices/${inv.id}`} className="font-mono text-lap-teal hover:underline">
                  {inv.invoiceNumber}
                </Link>
              </td>
              <td className="px-3 py-2.5 text-lap-slate">{formatDate(inv.issueDate)}</td>
              <td className="px-3 py-2.5 text-lap-slate">{formatDate(inv.dueDate)}</td>
              <td className="px-3 py-2.5">
                <DocStatusChip status={inv.status} />
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-lap-ink">{formatMoney(inv.grandTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity tab
// ---------------------------------------------------------------------------

function ActivityPanel({ customerId, activities }: { customerId: string; activities: Customer360Activity[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-lap-slate">Latest touchpoints for this account.</p>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark"
        >
          <PlusIcon className="h-4 w-4" />
          Log activity
        </button>
      </div>

      {activities.length === 0 ? (
        <EmptyRow>No activity logged yet. Record the first call, email, or visit.</EmptyRow>
      ) : (
        <ul className="divide-y divide-lap-border border-t border-lap-border">
          {activities.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-3">
              <Chip tone="teal">{ACTIVITY_LABELS[a.type] ?? a.type}</Chip>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-lap-ink">{a.note}</p>
                <p className="mt-0.5 text-xs text-lap-slate">
                  {formatDateTime(a.occurredAt)}
                  {a.userName ? ` · ${a.userName}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <LogActivityDrawer customerId={customerId} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function LogActivityDrawer({
  customerId,
  open,
  onClose,
}: {
  customerId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Set after mount (empty during SSR): a render-time "now" would hydrate to a different
  // minute than the server HTML and trip React's attribute-mismatch warning.
  const [occurredAt, setOccurredAt] = useState("");
  useEffect(() => {
    if (open) setOccurredAt(localDateTimeNow());
  }, [open]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await logActivityAction({
        type: form.get("type"),
        customerId,
        note: String(form.get("note") ?? ""),
        occurredAt: String(form.get("occurredAt") ?? "") || undefined,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not log the activity.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Drawer open={open} onClose={onClose} title="Log activity">
      <form onSubmit={submit} className="space-y-4 p-4">
        <Field label="Type">
          <select name="type" defaultValue="CALL" className={inputClass}>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note">
          <textarea
            name="note"
            required
            rows={4}
            placeholder="What happened on this touchpoint?"
            className={inputClass}
          />
        </Field>
        <Field label="Occurred at">
          <input
            name="occurredAt"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={inputClass}
          />
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
          {pending ? "Saving..." : "Save activity"}
        </button>
      </form>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Tasks tab
// ---------------------------------------------------------------------------

function TasksPanel({
  customerId,
  tasks,
  isAdmin,
  currentUserId,
  reps,
}: {
  customerId: string;
  tasks: Customer360Task[];
  isAdmin: boolean;
  currentUserId: string;
  reps: Array<{ id: string; name: string }>;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-lap-slate">Follow-ups tied to this account.</p>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark"
        >
          <PlusIcon className="h-4 w-4" />
          Add task
        </button>
      </div>

      {tasks.length === 0 ? (
        <EmptyRow>No tasks yet. Add a follow-up so this account does not go quiet.</EmptyRow>
      ) : (
        <ul className="divide-y divide-lap-border border-t border-lap-border">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}

      <AddTaskDrawer
        customerId={customerId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        reps={reps}
      />
    </div>
  );
}

function TaskRow({ task }: { task: Customer360Task }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const overdue = task.status === "OPEN" && new Date(task.dueDate).getTime() < Date.now();

  function run(action: (id: string) => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action(task.id);
      if (!result.ok) {
        setError(result.error ?? "Could not update the task.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-sm font-medium ${
                task.status === "CANCELLED" ? "text-lap-slate line-through" : "text-lap-ink"
              }`}
            >
              {task.title}
            </p>
            <Chip tone={PRIORITY_TONES[task.priority] ?? "slate"}>
              {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
            </Chip>
            <DocStatusChip status={task.status} />
          </div>
          <p className="mt-0.5 text-xs text-lap-slate">
            Due <span className={overdue ? "font-semibold text-lap-red" : ""}>{formatDate(task.dueDate)}</span>
            {task.assigneeName ? ` · ${task.assigneeName}` : ""}
          </p>
          {task.note && <p className="mt-1 text-xs text-lap-slate">{task.note}</p>}
          {error && (
            <p className="mt-1 text-xs font-medium text-lap-red" role="alert">
              {error}
            </p>
          )}
        </div>
        {task.status === "OPEN" && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(completeTaskAction)}
              className="min-h-touch rounded-[10px] border border-lap-green px-3 text-xs font-semibold text-lap-green transition-colors duration-150 hover:bg-lap-green/10 disabled:opacity-50"
            >
              Complete
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(cancelTaskAction)}
              className="min-h-touch rounded-[10px] border border-lap-border px-3 text-xs font-semibold text-lap-slate transition-colors duration-150 hover:bg-lap-page disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function AddTaskDrawer({
  customerId,
  open,
  onClose,
  isAdmin,
  currentUserId,
  reps,
}: {
  customerId: string;
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  currentUserId: string;
  reps: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Post-mount default for the same hydration-safety reason as the activity drawer.
  const [dueDate, setDueDate] = useState("");
  useEffect(() => {
    if (open) setDueDate(localDateToday());
  }, [open]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createTaskAction({
        title: String(form.get("title") ?? ""),
        note: String(form.get("note") ?? "") || undefined,
        customerId,
        assigneeId: isAdmin ? String(form.get("assigneeId") ?? "") || undefined : undefined,
        dueDate: String(form.get("dueDate") ?? ""),
        priority: form.get("priority"),
      });
      if (!result.ok) {
        setError(result.error ?? "Could not create the task.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add task">
      <form onSubmit={submit} className="space-y-4 p-4">
        <Field label="Title">
          <input name="title" required placeholder="Call about reorder" className={inputClass} />
        </Field>
        <Field label="Due date">
          <input
            name="dueDate"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Priority">
          <select name="priority" defaultValue="MEDIUM" className={inputClass}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </Field>
        {isAdmin && (
          <Field label="Assignee">
            <select name="assigneeId" defaultValue={currentUserId} className={inputClass}>
              <option value={currentUserId}>Me</option>
              {reps
                .filter((r) => r.id !== currentUserId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <Field label="Note (optional)">
          <textarea name="note" rows={3} className={inputClass} />
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
          {pending ? "Saving..." : "Create task"}
        </button>
      </form>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Shared drawer shell + form bits
// ---------------------------------------------------------------------------

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

function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div className={open ? "" : "pointer-events-none"} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-lap-teal-dark/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto bg-lap-surface shadow-lapDrawer transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-lap-border px-4 py-3">
          <h2 className="font-heading text-lg font-semibold text-lap-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-touch w-touch items-center justify-center rounded-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local now for datetime-local inputs (which take no timezone). */
function localDateTimeNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDateToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
