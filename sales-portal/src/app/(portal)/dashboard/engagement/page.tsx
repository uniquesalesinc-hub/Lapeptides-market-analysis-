import Link from "next/link";
import { getEffectiveViewer } from "@/lib/viewAs";
import { activityCountsByType, listActivities } from "@/lib/data/activities";
import { listTasks } from "@/lib/data/tasks";
import { PageHeader } from "@/components/shell/PageHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { EngagementStats } from "@/components/dashboard/EngagementStats";
import { Chip } from "@/components/customers/chips";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata = { title: "Engagement | LA Peptides Sales Portal" };

const ACTIVITY_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  VISIT: "Visit",
  MEETING: "Meeting",
  NOTE: "Note",
};

/** Engagement tab: activity counts vs previous month, timeline, and the next 7 days of tasks. */
export default async function DashboardEngagementPage() {
  const user = await getEffectiveViewer();
  const isAdmin = user.role === "ADMIN";
  const userScope = isAdmin ? undefined : user.id;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [counts, activityRows, openTasks] = await Promise.all([
    activityCountsByType(monthStart, now, userScope),
    listActivities(userScope ? { userId: userScope } : {}),
    listTasks({ status: "OPEN", ...(isAdmin ? {} : { assigneeId: user.id }) }),
  ]);

  const timeline = activityRows.slice(0, 20);
  const upcomingTasks = openTasks.filter(
    (t) => t.dueDate.getTime() >= now.getTime() && t.dueDate.getTime() <= in7Days.getTime()
  );

  return (
    <div>
      <PageHeader
        title="Engagement"
        description={
          isAdmin
            ? "Every logged touchpoint across the team, against the previous month."
            : "Your logged touchpoints, against the previous month."
        }
      />
      <DashboardTabs isAdmin={isAdmin} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="order-2 rounded-[10px] border border-lap-border bg-lap-surface shadow-lap xl:order-1">
          <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
            Activity timeline
          </h2>
          {timeline.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-lap-slate">
              No activity logged yet. Record calls, emails, and visits from any customer page.
            </p>
          ) : (
            <ul className="divide-y divide-lap-border">
              {timeline.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <Chip tone="teal">{ACTIVITY_LABELS[a.type] ?? a.type}</Chip>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      {a.customer ? (
                        <Link
                          href={`/customers/${a.customer.id}`}
                          className="text-sm font-medium text-lap-teal hover:underline"
                        >
                          {a.customer.businessName}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-lap-ink">Customer removed</span>
                      )}
                      {a.user?.name && <span className="text-xs text-lap-slate">{a.user.name}</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-lap-ink">{a.note}</p>
                    <p className="mt-0.5 text-xs text-lap-slate">{formatDateTime(a.occurredAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="order-1 space-y-6 xl:order-2">
          <EngagementStats counts={counts} />

          <section className="rounded-[10px] border border-lap-border bg-lap-surface shadow-lap">
            <h2 className="border-b border-lap-border px-4 py-3 font-heading text-base font-semibold text-lap-ink">
              Upcoming tasks <span className="ml-1 text-sm font-normal text-lap-slate">next 7 days</span>
            </h2>
            {upcomingTasks.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-lap-slate">Nothing due in the next 7 days.</p>
            ) : (
              <ul className="divide-y divide-lap-border">
                {upcomingTasks.map((t) => (
                  <li key={t.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-lap-ink">{t.title}</p>
                    <p className="mt-0.5 text-xs text-lap-slate">
                      Due {formatDate(t.dueDate)}
                      {t.customer ? (
                        <>
                          {" · "}
                          <Link href={`/customers/${t.customer.id}`} className="text-lap-teal hover:underline">
                            {t.customer.businessName}
                          </Link>
                        </>
                      ) : null}
                      {t.assignee?.name ? ` · ${t.assignee.name}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
