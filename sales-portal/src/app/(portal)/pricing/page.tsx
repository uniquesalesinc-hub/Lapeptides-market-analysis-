import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getCatalog, PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { VariantActiveToggle } from "@/components/pricing/VariantActiveToggle";
import { formatMoney } from "@/lib/format";
import type { PriceListCode, ProductCategory } from "@prisma/client";

export default async function PricingAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ priceList?: string; category?: string; q?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const priceListCode = (sp.priceList as PriceListCode) || "BULK_RETAIL";
  const category = sp.category as ProductCategory | undefined;

  const products = await getCatalog(priceListCode, { search: sp.q, category, includeInactive: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Pricing Administration</h1>
        <Link href="/pricing/upload" className="btn-primary !min-h-0 !px-4 !py-2 text-sm">
          Upload Pricing
        </Link>
      </div>
      <p className="text-sm text-brand-slate-400">
        Master wholesale pricing. Sales representatives cannot edit these prices — only
        administrators can, via a reviewed pricing file upload.
      </p>

      <CatalogFilters priceListCode={priceListCode} category={category} search={sp.q} />

      <p className="text-xs text-brand-slate-400">Viewing: {PRICE_LIST_LABELS[priceListCode]}</p>

      <div className="space-y-2">
        {products.map((product) => (
          <div key={product.id} className="card p-4">
            <div className="mb-2 flex items-start justify-between">
              <p className="font-semibold text-white">{product.name}</p>
              <Link href={`/pricing/products/${product.id}`} className="text-sm text-brand-teal">
                Edit
              </Link>
            </div>
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-brand-slate-400">
                    <th className="py-1 pr-3 font-medium">SKU</th>
                    <th className="py-1 pr-3 font-medium">Size</th>
                    <th className="py-1 pr-3 font-medium">Entry price</th>
                    <th className="py-1 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((v) => (
                    <tr key={v.id} className="border-t border-brand-border">
                      <td className="py-1.5 pr-3 font-mono text-xs">{v.sku}</td>
                      <td className="py-1.5 pr-3">{v.size}</td>
                      <td className="py-1.5 pr-3">{v.entryPrice != null ? formatMoney(v.entryPrice) : "—"}</td>
                      <td className="py-1.5">
                        <VariantActiveToggle variantId={v.id} isActive={v.isActive} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
