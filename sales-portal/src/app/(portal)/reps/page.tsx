import { requireAdmin } from "@/lib/session";
import { listAllUsers } from "@/lib/data/users";
import { CreateRepForm } from "@/components/reps/CreateRepForm";
import { RepRow } from "@/components/reps/RepRow";

export default async function RepsPage() {
  await requireAdmin();
  const users = await listAllUsers();
  const reps = users.filter((u) => u.role === "SALES_REP");
  const admins = users.filter((u) => u.role === "ADMIN");

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-xl font-semibold text-lap-ink">Sales Representatives</h1>
      <CreateRepForm />

      <div className="space-y-2">
        {reps.map((r) => (
          <RepRow
            key={r.id}
            id={r.id}
            name={r.name}
            email={r.email}
            status={r.status}
            discountLimitPercent={Number(r.discountLimitPercent)}
            customerCount={r._count.customers}
            quoteCount={r._count.quotes}
            lastLoginAt={r.lastLoginAt}
          />
        ))}
        {reps.length === 0 && <p className="text-sm text-lap-slate">No sales representatives yet.</p>}
      </div>

      <section>
        <h2 className="mb-2 font-heading text-base font-semibold text-lap-ink">Administrators</h2>
        <ul className="space-y-2">
          {admins.map((a) => (
            <li key={a.id} className="card p-3 text-sm">
              <p className="text-lap-ink">{a.name}</p>
              <p className="text-lap-slate">{a.email}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
