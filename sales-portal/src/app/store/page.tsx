import Link from "next/link";

/**
 * Minimal storefront home placeholder. Task 3 replaces this with the real public catalog
 * (hero, category tiles, product grid with login-gated prices).
 */
export default function StoreHomePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-24 text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-lap-teal">
        Wholesale client portal
      </p>
      <h1 className="mb-4 font-heading text-3xl font-semibold text-lap-ink">
        Storefront coming soon
      </h1>
      <p className="mb-8 max-w-xl text-lap-slate">
        Approved wholesale buyers will browse the full LA Peptides catalog here with their
        account pricing and order self-serve. Log in to your client account, or request one if
        you are new to LA Peptides.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/store/login" className="btn-primary px-6">
          Client login
        </Link>
        <Link href="/store/signup" className="btn-secondary px-6">
          Request an account
        </Link>
      </div>
    </div>
  );
}
