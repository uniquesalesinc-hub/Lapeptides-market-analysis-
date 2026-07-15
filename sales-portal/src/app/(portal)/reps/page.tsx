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
      <h1 className="text-xl font-semibold text-white">Sales Representatives</h1>
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
        {reps.length === 0 && <p className="text-sm text-brand-slate-400">No sales representatives yet.</p>}
      </div>

      <section>
        <h2 className="mb-2 font-semibold text-white">Administrators</h2>
        <ul className="space-y-2">
          {admins.map((a) => (
            <li key={a.id} className="card p-3 text-sm">
              <p className="text-white">{a.name}</p>
              <p className="text-brand-slate-400">{a.email}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
