import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getEffectiveViewer } from "@/lib/viewAs";
import { getCustomer360 } from "@/lib/data/customers";
import { getBrandKit } from "@/lib/data/brand";
import { listSalesReps } from "@/lib/data/users";
import { PageHeader } from "@/components/shell/PageHeader";
import { CustomerFacts } from "@/components/customers/CustomerFacts";
import { CustomerStats } from "@/components/customers/CustomerStats";
import { CustomerHistoryTabs } from "@/components/customers/CustomerHistoryTabs";
import { CustomerAdminControls } from "@/components/customers/CustomerAdminControls";

export const metadata = { title: "Customer | LA Peptides Sales Portal" };

/**
 * Customer 360: facts panel + admin commercial controls on the left, stat table-card and
 * history tabs (Orders | Quotes | Invoices | Activity | Tasks) on the right. Reps only
 * reach their own accounts; the admin controls card never renders for non-admins.
 */
export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const user = await getEffectiveViewer();
  const result = await getCustomer360(params.id, { id: user.id, role: user.role });
  if (result.status === "not_found") notFound();
  if (result.status === "denied") redirect("/customers");

  const { customer, stats, recent } = result;
  const isAdmin = user.role === "ADMIN";

  // Separate defensive fetch: degrades to a "pending database migration" notice on the
  // Brand tab instead of crashing the page while the shared DB awaits the brand-kit
  // migration. Access is already resolved above, so no extra scoping here.
  const brand = await getBrandKit(customer.id);
  // Mirrors getCustomer360 scoping: reps edit only their own accounts, admins edit any.
  // Reps never reach another rep's page at all, so this is belt and suspenders.
  const canEditBrand = isAdmin || customer.assignedRepId === user.id;

  // Rep options for the admin selects. The assigned rep can be an admin account (e.g. JJ),
  // which listSalesReps excludes; keep them selectable so saving never silently reassigns.
  let reps: Array<{ id: string; name: string }> = [];
  if (isAdmin) {
    reps = (await listSalesReps()).map((r) => ({ id: r.id, name: r.name }));
    if (!reps.some((r) => r.id === customer.assignedRepId)) {
      reps.unshift({ id: customer.assignedRep.id, name: customer.assignedRep.name });
    }
  }

  return (
    <div>
      <PageHeader
        title={customer.businessName}
        description={`${customer.contactName} · ${customer.assignedRep.name}`}
        actions={
          <>
            <Link
              href={`/customers/${customer.id}/edit`}
              className="inline-flex min-h-touch items-center rounded-[10px] border border-lap-border bg-lap-surface px-4 text-sm font-semibold text-lap-ink transition-colors duration-150 hover:bg-lap-page"
            >
              Edit details
            </Link>
            <Link
              href={`/order?customerId=${customer.id}`}
              className="inline-flex min-h-touch items-center rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark"
            >
              New quote
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <CustomerFacts customer={customer} />
          {isAdmin && (
            <CustomerAdminControls
              customer={{
                id: customer.id,
                defaultPriceListCode: customer.defaultPriceListCode,
                paymentTerms: customer.paymentTerms,
                assignedRepId: customer.assignedRepId,
                crmStatus: customer.crmStatus,
                billingAddress: customer.billingAddress,
                shippingAddress: customer.shippingAddress,
              }}
              reps={reps}
            />
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <CustomerStats stats={stats} />

          {customer.customerFacingNotes && (
            <section className="rounded-[10px] border border-lap-border bg-lap-surface p-4 shadow-lap">
              <p className="text-xs font-medium uppercase tracking-wide text-lap-slate">Customer-facing notes</p>
              <p className="mt-1 text-sm text-lap-ink">{customer.customerFacingNotes}</p>
            </section>
          )}
          {customer.internalNotes && (
            <section className="rounded-[10px] border border-lap-amber/40 bg-lap-surface p-4 shadow-lap">
              <p className="text-xs font-medium uppercase tracking-wide text-[#9A6318]">
                Internal notes (never shown to customer)
              </p>
              <p className="mt-1 text-sm text-lap-ink">{customer.internalNotes}</p>
            </section>
          )}

          <CustomerHistoryTabs
            customerId={customer.id}
            isAdmin={isAdmin}
            currentUserId={user.id}
            reps={reps}
            orders={recent.orders}
            quotes={recent.quotes}
            invoices={recent.invoices}
            activities={recent.activities}
            tasks={recent.tasks}
            brand={brand}
            canEditBrand={canEditBrand}
          />
        </div>
      </div>
    </div>
  );
}
