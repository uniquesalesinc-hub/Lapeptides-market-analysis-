import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProductDescriptionForm } from "@/components/pricing/ProductDescriptionForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!product) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">{product.name}</h1>
      <p className="text-sm text-brand-slate-400">{product.category.replace(/_/g, " ")}</p>

      <ProductDescriptionForm
        productId={product.id}
        description={product.description ?? ""}
        internalNotes={product.internalNotes ?? ""}
      />

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
