import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { getClientSession } from "@/lib/clientSession";
import { getStoreSearchIndex } from "@/lib/data/storeCatalog";
import { clientLogoutAction } from "@/lib/actions/client-auth-actions";
import { CategoryNav } from "@/components/store/CategoryNav";
import { StoreSearch } from "@/components/store/StoreSearch";
import { OrderIcon } from "@/components/shell/icons";

export const metadata: Metadata = {
  title: "LA Peptides | Wholesale Client Portal",
  description: "Research peptides for licensed practitioners and researchers. Wholesale client portal.",
};

/**
 * Storefront shell: a warmer, lighter expression of the same LA Peptides design system -
 * white masthead with category nav and search, no admin nav rail. Auth here is the CLIENT
 * session only; the rep/admin NextAuth session is a separate surface and never appears in
 * this layout. The search index is unpriced by construction (names/sizes/SKUs only), so
 * fetching it for anonymous visitors leaks nothing.
 */
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [session, searchIndex] = await Promise.all([getClientSession(), getStoreSearchIndex()]);

  return (
    <div className="flex min-h-dvh flex-col bg-lap-surface">
      <header className="border-b border-lap-border bg-lap-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/store" aria-label="LA Peptides storefront home" className="shrink-0">
            <Logo />
          </Link>

          <div className="flex flex-1 justify-center">
            <StoreSearch items={searchIndex} />
          </div>

          {session ? (
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/store/cart"
                aria-label="View cart"
                className="flex h-touch w-touch items-center justify-center rounded-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-teal-wash hover:text-lap-teal"
              >
                <OrderIcon className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                href="/store/account"
                className="hidden text-sm font-medium text-lap-ink hover:text-lap-teal sm:block"
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
              className="shrink-0 rounded-[10px] border border-lap-border px-4 py-2 text-sm font-semibold text-lap-teal transition-colors duration-150 hover:bg-lap-teal-wash"
            >
              Client login
            </Link>
          )}
        </div>

        {/* Category nav row: link-based so every category view is a shareable URL. */}
        <Suspense fallback={<div className="h-touch" />}>
          <CategoryNav />
        </Suspense>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-lap-border bg-lap-page">
        <div className="mx-auto w-full max-w-6xl space-y-3 px-4 py-10 sm:px-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-lap-slate">
            For research purposes only - not for human consumption.
          </p>
          {/* Compliance copy verbatim from lapeptides.net - do not paraphrase. */}
          <p className="max-w-[80ch] text-xs text-lap-slate">
            All products sold and distributed by LA Peptides are intended solely for legitimate
            laboratory research and development purposes. These products are not to be used for
            any other purposes, including but not limited to: in vivo or in vitro diagnostic use,
            therapeutic applications, human or animal consumption.
          </p>
          <p className="max-w-[80ch] text-xs text-lap-slate">
            None of the products provided by LA Peptides have been approved, cleared, or
            authorized by the U.S. Food and Drug Administration (FDA) for any use.
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
