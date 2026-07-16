import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { getClientSession } from "@/lib/clientSession";
import { ClientLoginForm } from "@/components/store/ClientLoginForm";

/**
 * Client login for the wholesale storefront. Deliberately NOT the admin app's login: a
 * warm, centered brand card in the spirit of lapeptides.net. `?from=` carries the store
 * path the visitor was heading to; the action sanitizes it to store-internal paths only.
 */
export default async function StoreLoginPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}) {
  // Already signed in? Straight to the account area.
  if (await getClientSession()) redirect("/store/account");

  return (
    <div className="flex flex-col items-center bg-lap-teal-wash/40 px-6 py-20">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center font-heading text-2xl font-semibold text-lap-ink">
          Client sign in
        </h1>
        <p className="mb-8 text-center text-sm text-lap-slate">
          Browse the catalog with your account pricing and order self-serve.
        </p>
        <ClientLoginForm from={searchParams?.from} />
      </div>
      <p className="mt-6 text-sm text-lap-slate">
        New to LA Peptides?{" "}
        <Link href="/store/signup" className="font-semibold text-lap-teal hover:underline">
          Request an account
        </Link>
      </p>
    </div>
  );
}
