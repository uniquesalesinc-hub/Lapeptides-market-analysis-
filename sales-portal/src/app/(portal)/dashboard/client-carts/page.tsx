import { requireAdmin } from "@/lib/session";
import { listOpenClientCarts } from "@/lib/data/clientCarts";
import { PageHeader } from "@/components/shell/PageHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { OpenClientCarts } from "@/components/dashboard/OpenClientCarts";

export const metadata = { title: "Open client carts | LA Peptides Sales Portal" };

/** Admin-only full list behind the dashboard's Open client carts card. */
export default async function DashboardClientCartsPage() {
  await requireAdmin();
  const openCarts = await listOpenClientCarts();

  return (
    <div>
      <PageHeader
        title="Open client carts"
        description="Every portal cart with items in it, newest activity first."
      />
      <DashboardTabs isAdmin />
      <OpenClientCarts rows={openCarts.rows} totalCount={openCarts.totalCount} />
    </div>
  );
}
