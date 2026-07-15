import { requireUser } from "@/lib/session";
import { listSalesReps } from "@/lib/data/users";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { createCustomer } from "@/lib/actions/customer-actions";

export default async function NewCustomerPage() {
  const user = await requireUser();
  const reps =
    user.role === "ADMIN"
      ? (await listSalesReps()).map((r) => ({ id: r.id, name: r.name }))
      : [{ id: user.id, name: user.name ?? "Me" }];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">New Customer</h1>
      <CustomerForm action={createCustomer} reps={reps} isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
