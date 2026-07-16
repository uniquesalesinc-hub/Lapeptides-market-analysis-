import { requireAdmin } from "@/lib/session";
import { listCustomerOptions, listPortalUsers } from "@/lib/data/portalUsers";
import { PageHeader } from "@/components/shell/PageHeader";
import { CustomerAreaTabs } from "@/components/customers/CustomerAreaTabs";
import { PortalUsersManager, type PortalUserRow } from "@/components/customers/PortalUsersManager";

export const metadata = { title: "Portal Users | LA Peptides Sales Portal" };

/** Admin-only client-login management. Non-admins are redirected by requireAdmin. */
export default async function PortalUsersPage() {
  await requireAdmin();

  const [portalUsers, customers] = await Promise.all([listPortalUsers(), listCustomerOptions()]);

  const rows: PortalUserRow[] = portalUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status,
    invitedAt: u.invitedAt,
    lastLoginAt: u.lastLoginAt,
    lastActiveAt: u.lastActiveAt,
    createdAt: u.createdAt,
    customer: u.customer,
  }));

  return (
    <div>
      <PageHeader
        title="Portal Users"
        description="Storefront logins for approved wholesale buyers: invite, disable, and reset access."
      />
      <CustomerAreaTabs isAdmin />

      <PortalUsersManager portalUsers={rows} customers={customers} />
    </div>
  );
}
