import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getCustomerById } from "@/lib/data/customers";
import { listSalesReps } from "@/lib/data/users";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { updateCustomer } from "@/lib/actions/customer-actions";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();
  if (user.role === "SALES_REP" && customer.assignedRepId !== user.id) redirect("/customers");

  const reps =
    user.role === "ADMIN"
      ? (await listSalesReps()).map((r) => ({ id: r.id, name: r.name }))
      : [{ id: user.id, name: user.name ?? "Me" }];
  const boundAction = updateCustomer.bind(null, id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Edit {customer.businessName}</h1>
      <CustomerForm action={boundAction} customer={customer} reps={reps} isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
