"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelTaskAction, completeTaskAction, createTaskAction } from "@/lib/actions/task-actions";
import { formatDate } from "@/lib/format";
import { PlusIcon } from "@/components/shell/icons";
import { Drawer, Field, inputClass, localDateToday } from "@/components/ui/drawer";
import { Chip, type ChipTone } from "@/components/customers/chips";

const PRIORITY_TONES: Record<string, ChipTone> = { HIGH: "red", MEDIUM: "amber", LOW: "slate" };

export interface TaskBoardTask {
  id: string;
  title: string;
  note: string | null;
  dueDate: Date;
  priority: string;
  status: string;
  customer: { id: string; businessName: string } | null;
  assignee: { id: string; name: string } | null;
}

export interface TaskBoardProps {
  tasks: TaskBoardTask[];
  isAdmin: boolean;
  currentUserId: string;
  customers: Array<{ id: string; businessName: string }>;
  reps: Array<{ id: string; name: string }>;
}

/**
 * Dashboard Tasks tab body: open tasks grouped overdue-first with inline complete/cancel,
 * plus a quick-add drawer (title, optional customer, due date, priority; admins can assign).
 */
export function TaskBoard({ tasks, isAdmin, currentUserId, customers, reps }: TaskBoardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const now = Date.now();

  const open = tasks.filter((t) => t.status === "OPEN");
  const overdue = open.filter((t) => new Date(t.dueDate).getTime() < now);
  const upcoming = open.filter((t) => new Date(t.dueDate).getTime() >= now);

  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
      <div className="flex items-center justify-between border-b border-lap-border px-4 py-3">
        <h2 className="font-heading text-base font-semibold text-lap-ink">Open tasks</h2>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark"
        >
          <PlusIcon className="h-4 w-4" />
          Add task
        </button>
      </div>

      {open.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-lap-slate">
          No open tasks. Add a follow-up so nothing goes quiet.
        </p>
      ) : (
        <div>
          {overdue.length > 0 && (
            <div>
              <p className="border-b border-lap-border bg-lap-red/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-lap-red">
                Overdue ({overdue.length})
              </p>
              <ul className="divide-y divide-lap-border">
                {overdue.map((t) => (
                  <TaskRow key={t.id} task={t} overdue />
                ))}
              </ul>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <p className="border-y border-lap-border bg-lap-page px-4 py-2 text-xs font-semibold uppercase tracking-wide text-lap-slate">
                Coming up ({upcoming.length})
              </p>
              <ul className="divide-y divide-lap-border">
                {upcoming.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <QuickAddTaskDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        customers={customers}
        reps={reps}
      />
    </section>
  );
}

function TaskRow({ task, overdue = false }: { task: TaskBoardTask; overdue?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-lap-ink">{task.title}</p>
          <Chip tone={PRIORITY_TONES[task.priority] ?? "slate"}>
            {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
          </Chip>
        </div>
        <p className="mt-0.5 text-xs text-lap-slate">
          Due <span className={overdue ? "font-semibold text-lap-red" : ""}>{formatDate(task.dueDate)}</span>
          {task.customer ? (
            <>
              {" · "}
              <Link href={`/customers/${task.customer.id}`} className="text-lap-teal hover:underline">
                {task.customer.businessName}
              </Link>
            </>
          ) : null}
          {task.assignee?.name ? ` · ${task.assignee.name}` : ""}
        </p>
        {task.note && <p className="mt-1 text-xs text-lap-slate">{task.note}</p>}
        {error && (
          <p className="mt-1 text-xs font-medium text-lap-red" role="alert">
            {error}
          </p>
        )}
      </div>
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
    </li>
  );
}

function QuickAddTaskDrawer({
  open,
  onClose,
  isAdmin,
  currentUserId,
  customers,
  reps,
}: {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  currentUserId: string;
  customers: Array<{ id: string; businessName: string }>;
  reps: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Post-mount default: a render-time "today" would mismatch the server HTML on hydration.
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
        customerId: String(form.get("customerId") ?? "") || undefined,
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
        <Field label="Customer (optional)">
          <select name="customerId" defaultValue="" className={inputClass}>
            <option value="">No customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.businessName}
              </option>
            ))}
          </select>
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
