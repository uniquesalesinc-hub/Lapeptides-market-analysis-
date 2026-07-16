import { getEffectiveViewer } from "@/lib/viewAs";
import { listTasks, taskCounts } from "@/lib/data/tasks";
import { listOrderModeCustomers } from "@/lib/data/customers";
import { listSalesReps } from "@/lib/data/users";
import { PageHeader } from "@/components/shell/PageHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { TaskBoard, type TaskBoardTask } from "@/components/dashboard/TaskBoard";

export const metadata = { title: "Tasks | LA Peptides Sales Portal" };

/** Tasks tab: counts in context, then open tasks grouped overdue-first with quick-add. */
export default async function DashboardTasksPage() {
  const user = await getEffectiveViewer();
  const isAdmin = user.role === "ADMIN";
  const viewer = { id: user.id, role: user.role } as const;
  const assigneeScope = isAdmin ? undefined : user.id;

  const [counts, taskRows, customers, reps] = await Promise.all([
    taskCounts(assigneeScope),
    listTasks(assigneeScope ? { assigneeId: assigneeScope } : {}),
    listOrderModeCustomers(viewer),
    isAdmin ? listSalesReps() : Promise.resolve([]),
  ]);

  const tasks: TaskBoardTask[] = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    note: t.note,
    dueDate: t.dueDate,
    priority: t.priority,
    status: t.status,
    customer: t.customer,
    assignee: t.assignee,
  }));

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={
          isAdmin ? "Every follow-up across the team, overdue first." : "Your follow-ups, overdue first."
        }
      />
      <DashboardTabs isAdmin={isAdmin} />

      <div className="space-y-6">
        <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
          <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
            Where tasks stand
          </h2>
          <div className="divide-y divide-lap-border">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-lap-ink">Open</p>
                <p className="text-xs text-lap-slate">tasks not yet completed or cancelled</p>
              </div>
              <p className="font-mono text-lg font-semibold text-lap-ink">{counts.open}</p>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-lap-ink">Overdue</p>
                <p className="text-xs text-lap-slate">open and past their due date</p>
              </div>
              <p className={`font-mono text-lg font-semibold ${counts.overdue > 0 ? "text-lap-red" : "text-lap-ink"}`}>
                {counts.overdue}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-lap-ink">Done this month</p>
                <p className="text-xs text-lap-slate">completed since the 1st</p>
              </div>
              <p className="font-mono text-lg font-semibold text-lap-ink">{counts.doneThisMonth}</p>
            </div>
          </div>
        </section>

        <TaskBoard
          tasks={tasks}
          isAdmin={isAdmin}
          currentUserId={user.id}
          customers={customers.map((c) => ({ id: c.id, businessName: c.businessName }))}
          reps={reps.map((r) => ({ id: r.id, name: r.name }))}
        />
      </div>
    </div>
  );
}
