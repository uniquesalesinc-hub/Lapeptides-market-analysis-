import { requireUser } from "@/lib/session";
import { getDashboardHome } from "@/lib/data/dashboard";
import { listActivities } from "@/lib/data/activities";
import { getReorderRadar } from "@/lib/data/reorderRadar";
import { PageHeader } from "@/components/shell/PageHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { KpiRow } from "@/components/dashboard/KpiRow";
import { RecentColumns, type ActivityFeedRow } from "@/components/dashboard/RecentColumns";
import { ReorderRadar } from "@/components/dashboard/ReorderRadar";

export const metadata = { title: "Dashboard | LA Peptides Sales Portal" };

/**
 * Dashboard Home: role-scoped month summary (rep = own numbers, admin = all),
 * three recent columns, and the reorder radar.
 */
export default async function DashboardHomePage() {
  const user = await requireUser();
  const viewer = { id: user.id, role: user.role } as const;
  const isAdmin = user.role === "ADMIN";

  const [{ summary, recentOrders, recentQuotes }, activityRows, radarRows] = await Promise.all([
    getDashboardHome(viewer),
    listActivities(isAdmin ? {} : { userId: user.id }),
    getReorderRadar(viewer),
  ]);

  const activities: ActivityFeedRow[] = activityRows.slice(0, 6).map((a) => ({
    id: a.id,
    type: a.type,
    note: a.note,
    occurredAt: a.occurredAt,
    customerId: a.customer?.id ?? null,
    customerName: a.customer?.businessName ?? null,
    userName: a.user?.name ?? null,
  }));

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name?.split(" ")[0] ?? "there"}`}
        description={
          isAdmin
            ? "Company-wide pipeline: what needs your attention today."
            : "Your book of business: what needs your attention today."
        }
      />
      <DashboardTabs isAdmin={isAdmin} />

      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <KpiRow summary={summary} scopeLabel={isAdmin ? "all reps" : "your accounts"} />
          <ReorderRadar rows={radarRows.slice(0, 8)} />
        </div>
        <RecentColumns orders={recentOrders} activities={activities} quotes={recentQuotes} />
      </div>
    </div>
  );
}
