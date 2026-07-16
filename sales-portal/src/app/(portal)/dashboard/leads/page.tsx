import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listLeads, matchLeadType } from "@/lib/data/leads";
import { listSalesReps } from "@/lib/data/users";
import { PageHeader } from "@/components/shell/PageHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { LeadsInbox } from "@/components/dashboard/LeadsInbox";
import type { LeadInboxRow } from "@/components/dashboard/LeadDrawer";
import type { LeadReviewStatus } from "@prisma/client";

export const metadata = { title: "Leads | LA Peptides Sales Portal" };

const STATUS_VALUES: LeadReviewStatus[] = ["OPEN", "APPROVED", "REJECTED"];

/** Admin-only leads inbox. Non-admins are redirected by requireAdmin, like /reports. */
export default async function DashboardLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const statusFilter = STATUS_VALUES.find((s) => s === sp.status);

  const [leadRows, customers, reps] = await Promise.all([
    listLeads(statusFilter),
    prisma.customer.findMany({ select: { id: true, email: true, businessName: true } }),
    listSalesReps(),
  ]);

  const customerNameById = new Map(customers.map((c) => [c.id, c.businessName]));

  const leads: LeadInboxRow[] = leadRows.map((lead) => {
    // Fresh match on every render: a customer created after the lead arrived still flags it.
    const match = matchLeadType({ email: lead.email, company: lead.company }, customers);
    return {
      id: lead.id,
      company: lead.company,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      source: lead.source,
      status: lead.status,
      createdAt: lead.createdAt,
      match: match.matchedCustomerId
        ? {
            customerId: match.matchedCustomerId,
            name: customerNameById.get(match.matchedCustomerId) ?? "Unknown",
          }
        : null,
      createdCustomer: lead.createdCustomer,
      reviewedByName: lead.reviewedBy?.name ?? null,
      reviewedAt: lead.reviewedAt,
    };
  });

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Wholesale account requests: review, approve with rep and pricing, or reject."
      />
      <DashboardTabs isAdmin />

      <LeadsInbox
        leads={leads}
        reps={reps.map((r) => ({ id: r.id, name: r.name }))}
        activeFilter={statusFilter ?? ""}
      />
    </div>
  );
}
