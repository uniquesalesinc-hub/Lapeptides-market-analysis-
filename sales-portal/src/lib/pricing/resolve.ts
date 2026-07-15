import { prisma } from "@/lib/prisma";
import { calculateLineItemPricing, type LineItemPricingResult, type TierDefinition } from "./engine";
import type { PriceListCode } from "@prisma/client";

export interface ResolvedLine extends LineItemPricingResult {
  variantId: string;
  productName: string;
  sku: string;
  strength: string;
  quantity: number;
  priceListId: string;
  priceListName: string;
  effectiveDate: Date;
}

/**
 * The single authoritative place quote/invoice line pricing is computed server-side. Never
 * trust a unit price submitted by the client — always re-derive it here from the active
 * PriceList in the database so a tampered request can't apply an arbitrary price.
 */
export async function resolveLineItemPricing(
  variantId: string,
  quantity: number,
  priceListCode: PriceListCode
): Promise<ResolvedLine | null> {
  const priceList = await prisma.priceList.findFirst({
    where: { code: priceListCode, isActive: true },
    include: { tiers: { orderBy: { tierNumber: "asc" } } },
  });
  if (!priceList) return null;

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: true,
      priceListEntries: { where: { priceListId: priceList.id } },
    },
  });
  if (!variant) return null;

  const tierDefs: TierDefinition[] = priceList.tiers.map((t) => ({
    tier: t.tierNumber,
    label: t.label,
    minimumBasis: t.minimumBasis,
    minQty: t.minQty,
    maxQty: t.maxQty,
  }));
  const priceMap = new Map(variant.priceListEntries.map((e) => [
    priceList.tiers.find((t) => t.id === e.pricingTierId)?.tierNumber ?? -1,
    Number(e.unitPrice),
  ]));

  const result = calculateLineItemPricing(quantity, tierDefs, priceMap);

  return {
    ...result,
    variantId,
    productName: variant.product.name,
    sku: variant.sku,
    strength: variant.size,
    quantity,
    priceListId: priceList.id,
    priceListName: priceList.name,
    effectiveDate: priceList.effectiveDate,
  };
}
