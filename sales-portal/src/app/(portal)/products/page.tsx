import { requireUser } from "@/lib/session";
import { getCatalog } from "@/lib/data/catalog";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { ProductCard } from "@/components/catalog/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PriceListCode, ProductCategory } from "@prisma/client";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ priceList?: string; category?: string; q?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const priceListCode = (sp.priceList as PriceListCode) || "BULK_RETAIL";
  const category = sp.category as ProductCategory | undefined;

  const products = await getCatalog(priceListCode, { search: sp.q, category });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Product Catalog</h1>
      <CatalogFilters priceListCode={priceListCode} category={category} search={sp.q} />

      {products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try a different search term, category, or price list."
        />
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
