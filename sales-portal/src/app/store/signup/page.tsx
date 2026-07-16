import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ClientSignupForm } from "@/components/store/ClientSignupForm";

/**
 * Public account request page. Signup here is lead intake: it files a WEBSITE-source Lead
 * into the admin review queue. Accounts are only created by LA Peptides after review.
 */
export default function StoreSignupPage() {
  return (
    <div className="flex flex-col items-center bg-lap-teal-wash/40 px-6 py-20">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center font-heading text-2xl font-semibold text-lap-ink">
          Request a wholesale account
        </h1>
        <p className="mb-8 text-center text-sm text-lap-slate">
          For licensed practitioners and researchers. Our team reviews every application
          before opening an account.
        </p>
        <ClientSignupForm />
      </div>
      <p className="mt-6 text-sm text-lap-slate">
        Already have an account?{" "}
        <Link href="/store/login" className="font-semibold text-lap-teal hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
