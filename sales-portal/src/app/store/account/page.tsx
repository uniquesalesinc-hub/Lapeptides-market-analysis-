import Link from "next/link";
import { requireClient } from "@/lib/clientSession";
import { clientLogoutAction } from "@/lib/actions/client-auth-actions";

/**
 * Minimal account placeholder behind requireClient. Task 3-4 replace this with the real
 * account area (order history, invoices, reorder). Its job today: prove the client session
 * gate end-to-end and give the logged-in user somewhere to land.
 */
export default async function StoreAccountPage() {
  const client = await requireClient();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-lap-teal">
        {client.customerName}
      </p>
      <h1 className="mb-4 font-heading text-3xl font-semibold text-lap-ink">
        Welcome, {client.name}
      </h1>
      <p className="mb-8 max-w-xl text-lap-slate">
        Your wholesale account is active. Browse the catalog with your account pricing; order
        history and checkout land here next.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/store" className="font-semibold text-lap-teal hover:underline">
          Browse the catalog
        </Link>
        <form action={clientLogoutAction}>
          <button type="submit" className="btn-secondary px-5 text-sm">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
