import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientSession } from "@/lib/clientSession";
import { getStoreProductDetail } from "@/lib/data/storeCatalog";
import { StoreProductDetail } from "@/components/store/StoreProductDetail";
import { RecentlyViewedRail } from "@/components/store/RecentlyViewed";

export const metadata = { title: "Product | LA Peptides" };

/**
 * Store product page. The data layer resolves the session's ladder (or strips prices for
 * anonymous visitors) before anything is serialized, so the client component below never
 * holds a price the viewer is not entitled to see.
 */
export default async function StoreProductPage({ params }: { params: { id: string } }) {
  const session = await getClientSession();
  const detail = await getStoreProductDetail(params.id, session);
  if (!detail) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/store" className="text-sm font-medium text-lap-slate hover:text-lap-teal">
        &larr; Back to catalog
      </Link>
      <div className="mt-6">
        <StoreProductDetail detail={detail} />
      </div>
      <RecentlyViewedRail
        current={{ id: detail.id, name: detail.name, category: detail.category }}
      />
    </div>
  );
}
