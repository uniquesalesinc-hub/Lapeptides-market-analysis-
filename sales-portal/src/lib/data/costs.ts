import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

/**
 * HARD-COST (COGS) read path. The requireAdmin() call inside this function is the security
 * boundary, independent of any page-level gating: a SALES_REP session can never receive
 * cost data from here, no matter what UI calls it.
 */
export interface CostBandView {
  tierNumber: number;
  bandLabel: string;
  unitCost: number;
  wholesalePrice: number | null;
  marginPct: number | null;
}

export interface VariantCostView {
  variantId: string;
  sku: string;
  size: string;
  bands: CostBandView[];
}

export async function getProductCostView(productId: string): Promise<VariantCostView[]> {
  await requireAdmin(); // COGS never leaves the server for non-admins

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
    include: {
      costs: { orderBy: { tierNumber: "asc" } },
      priceListEntries: {
        where: { priceList: { code: "BULK_WHOLESALE", isActive: true } },
        include: { pricingTier: true },
      },
    },
  });

  return variants.map((v) => ({
    variantId: v.id,
    sku: v.sku,
    size: v.size,
    bands: v.costs.map((c) => {
      const sell = v.priceListEntries.find((e) => e.pricingTier.tierNumber === c.tierNumber);
      const price = sell ? Number(sell.unitPrice) : null;
      const cost = Number(c.unitCost);
      return {
        tierNumber: c.tierNumber,
        bandLabel: c.maxQty != null ? `${c.minQty}\u2013${c.maxQty}` : `${c.minQty}+`,
        unitCost: cost,
        wholesalePrice: price,
        marginPct: price ? Math.round(((price - cost) / price) * 1000) / 10 : null,
      };
    }),
  }));
}
