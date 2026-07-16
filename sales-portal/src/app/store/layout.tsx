import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { getClientSession } from "@/lib/clientSession";
import { clientLogoutAction } from "@/lib/actions/client-auth-actions";

export const metadata: Metadata = {
  title: "LA Peptides | Wholesale Client Portal",
  description: "Research peptides for licensed practitioners and researchers. Wholesale client portal.",
};

/**
 * Storefront shell: a warmer, lighter expression of the same LA Peptides design system -
 * white masthead, teal accents, no admin nav rail. Task 3 expands this with category nav,
 * search, and cart. Auth here is the CLIENT session only; the rep/admin NextAuth session
 * is a separate surface and never appears in this layout.
 */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const session = await getClientSession();

  return (
    <div className="flex min-h-dvh flex-col bg-lap-surface">
      <header className="border-b border-lap-border bg-lap-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/store" aria-label="LA Peptides storefront home">
            <Logo />
          </Link>
          {session ? (
            <div className="flex items-center gap-4">
              <Link
                href="/store/account"
                className="text-sm font-medium text-lap-ink hover:text-lap-teal"
              >
                {session.name}
              </Link>
              <form action={clientLogoutAction}>
                <button
                  type="submit"
                  className="text-sm font-medium text-lap-slate transition-colors duration-150 hover:text-lap-teal"
                >
                  Log out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/store/login"
              className="rounded-[10px] border border-lap-border px-4 py-2 text-sm font-semibold text-lap-teal transition-colors duration-150 hover:bg-lap-teal-wash"
            >
              Client login
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-lap-border bg-lap-page">
        <div className="mx-auto w-full max-w-6xl space-y-3 px-4 py-8 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-lap-slate">
            For research purposes only - not for human consumption.
          </p>
          <p className="text-xs text-lap-slate">
            These products have not been evaluated by the FDA and are not intended to diagnose,
            treat, cure, or prevent any disease. Sold to licensed practitioners and researchers
            only.
          </p>
          <p className="text-xs text-lap-slate">
            &copy; {new Date().getFullYear()} LA Peptides. All rights reserved.{" "}
            <a
              href="https://lapeptides.net"
              className="text-lap-teal hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              lapeptides.net
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
