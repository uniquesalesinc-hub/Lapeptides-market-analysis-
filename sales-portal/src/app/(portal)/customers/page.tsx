import Link from "next/link";
import { getEffectiveViewer } from "@/lib/viewAs";
import { listCustomers } from "@/lib/data/customers";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { CustomerSearch } from "@/components/customers/CustomerSearch";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getEffectiveViewer();
  const sp = await searchParams;
  const customers = await listCustomers(user, { search: sp.q });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-lap-ink">Customers</h1>
        <Link href="/customers/new" className="btn-primary !min-h-0 !px-4 !py-2 text-sm">
          + New
        </Link>
      </div>

      <CustomerSearch defaultValue={sp.q} />

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add your first customer to start creating quotes."
          action={
            <Link href="/customers/new" className="btn-primary">
              Add a customer
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li key={c.id}>
              <Link href={`/customers/${c.id}`} className="card flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold text-lap-ink">{c.businessName}</p>
                  <p className="text-sm text-lap-slate">
                    {c.contactName} · {c.assignedRep.name}
                  </p>
                  {c.followUpDate && (
                    <p className="text-xs text-[#9A6318]">Follow up {formatDate(c.followUpDate)}</p>
                  )}
                </div>
                <div className="text-right text-xs text-lap-slate">
                  <p>{c._count.quotes} quotes</p>
                  <p>{c._count.invoices} invoices</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
