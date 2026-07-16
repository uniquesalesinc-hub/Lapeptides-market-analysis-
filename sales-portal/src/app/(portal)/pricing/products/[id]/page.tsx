import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProductDescriptionForm } from "@/components/pricing/ProductDescriptionForm";
import { getProductCostView } from "@/lib/data/costs";
import { formatMoney } from "@/lib/format";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!product) notFound();
  const costViews = await getProductCostView(id);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">{product.name}</h1>
      <p className="text-sm text-brand-slate-400">{product.category.replace(/_/g, " ")}</p>

      <ProductDescriptionForm
        productId={product.id}
        description={product.description ?? ""}
        internalNotes={product.internalNotes ?? ""}
      />

      <div className="card border-brand-danger/40 p-4">
        <p className="label-text !mb-2">Hard cost &amp; margin — admin only</p>
        <p className="mb-3 text-xs text-brand-slate-400">
          Company buy price per volume band vs. the Bulk Wholesale sell price. Reps never see
          this section or this data.
        </p>
        {costViews.every((v) => v.bands.length === 0) ? (
          <p className="text-sm text-brand-slate-400">
            No cost on file for this product (not present on the provided cost sheets).
          </p>
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-brand-slate-400">
                  <th className="pr-4">SKU</th>
                  <th className="pr-4">Band</th>
                  <th className="pr-4">Cost</th>
                  <th className="pr-4">Sell (wholesale)</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {costViews.flatMap((v) =>
                  v.bands.map((b) => (
                    <tr key={`${v.variantId}-${b.tierNumber}`} className="border-t border-brand-border">
                      <td className="py-1.5 pr-4 font-mono text-xs text-brand-slate-400">{v.size}</td>
                      <td className="pr-4 text-brand-slate-200">{b.bandLabel}</td>
                      <td className="pr-4 text-white">{formatMoney(b.unitCost)}</td>
                      <td className="pr-4 text-white">{b.wholesalePrice != null ? formatMoney(b.wholesalePrice) : "\u2014"}</td>
                      <td className={b.marginPct != null && b.marginPct < 30 ? "text-brand-danger" : "text-brand-teal"}>
                        {b.marginPct != null ? `${b.marginPct}%` : "\u2014"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-4">
        <p className="label-text !mb-2">SKUs</p>
        <ul className="space-y-1 text-sm">
          {product.variants.map((v) => (
            <li key={v.id} className="flex justify-between">
              <span className="font-mono text-xs text-brand-slate-400">{v.sku}</span>
              <span className="text-white">{v.size}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
