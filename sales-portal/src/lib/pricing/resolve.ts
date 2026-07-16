import { prisma } from "@/lib/prisma";
import { calculateLineItemPricing, type LineItemPricingResult, type TierDefinition } from "./engine";
import type { PriceListCode } from "@prisma/client";

export interface ResolvedLine extends LineItemPricingResult {
  variantId: string;
  /** The list this line actually priced from (format categories override the quote ladder). */
  effectivePriceListCode: PriceListCode;
  productName: string;
  sku: string;
  strength: string;
  quantity: number;
  priceListId: string;
  priceListName: string;
  effectiveDate: Date;
}

/**
 * Format categories always price from their own dedicated sheet, regardless of which
 * injectable ladder (Bulk Retail vs Bulk Wholesale) the quote is on. This is what makes
 * mixed-category quotes possible: the quote-level code chooses the INJECTABLE ladder only.
 */
const CATEGORY_LIST_OVERRIDES: Partial<Record<string, PriceListCode>> = {
  NASAL_SPRAY: "WHOLESALE_SPRAYS",
  TOPICAL_CREAM: "WHOLESALE_CREAMS",
  CAPSULE: "WHOLESALE_CAPSULES",
};

/**
 * The single authoritative place quote/invoice line pricing is computed server-side. Never
 * trust a unit price submitted by the client — always re-derive it here from the active
 * PriceList in the database so a tampered request can't apply an arbitrary price.
 *
 * `pooledQuantity` is the total unit count across the whole quote. Per the confirmed
 * mix-and-match rule, tier qualification is measured against the pool, not the single
 * line — EXCEPT capsules: their sheet prices a hard per-SKU band (1–49 bottles), so a
 * capsule line qualifies on its own quantity. Pooling a 300-unit order into a 10-capsule
 * line must not trip the 49-cap ceiling, and capsules gain nothing from pooling anyway
 * (one band, one price).
 */
export async function resolveLineItemPricing(
  variantId: string,
  quantity: number,
  priceListCode: PriceListCode,
  pooledQuantity: number = quantity
): Promise<ResolvedLine | null> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant) return null;

  const effectiveCode = CATEGORY_LIST_OVERRIDES[variant.product.category] ?? priceListCode;
  const qualifyingQuantity = effectiveCode === "WHOLESALE_CAPSULES" ? quantity : pooledQuantity;

  const priceList = await prisma.priceList.findFirst({
    where: { code: effectiveCode, isActive: true },
    include: { tiers: { orderBy: { tierNumber: "asc" } } },
  });
  if (!priceList) return null;

  const entries = await prisma.priceListEntry.findMany({
    where: { productVariantId: variantId, priceListId: priceList.id },
  });

  const tierDefs: TierDefinition[] = priceList.tiers.map((t) => ({
    tier: t.tierNumber,
    label: t.label,
    minimumBasis: t.minimumBasis,
    minQty: t.minQty,
    maxQty: t.maxQty,
  }));
  const priceMap = new Map(entries.map((e) => [
    priceList.tiers.find((t) => t.id === e.pricingTierId)?.tierNumber ?? -1,
    Number(e.unitPrice),
  ]));

  const result = calculateLineItemPricing(quantity, tierDefs, priceMap, qualifyingQuantity);

  return {
    ...result,
    variantId,
    productName: variant.product.name,
    sku: variant.sku,
    strength: variant.size,
    quantity,
    effectivePriceListCode: effectiveCode,
    priceListId: priceList.id,
    priceListName: priceList.name,
    effectiveDate: priceList.effectiveDate,
  };
}

/**
 * A free tracked sample (JJ 7/16): always $0.00, always qualifies, never priced from a
 * list, never counted toward the pooled quantity (the caller excludes it). The snapshot
 * fields point at the variant's own effective list purely for record-keeping; the
 * pricingTierLabel is set to "Sample" by the caller and is the tracking marker.
 */
export async function resolveSampleLine(
  variantId: string,
  quantity: number
): Promise<(ResolvedLine & { isSampleLine: true }) | null> {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant) return null;

  const effectiveCode = CATEGORY_LIST_OVERRIDES[variant.product.category] ?? "BULK_RETAIL";
  const priceList = await prisma.priceList.findFirst({
    where: { code: effectiveCode, isActive: true },
    select: { id: true, name: true, effectiveDate: true },
  });
  if (!priceList) return null;

  return {
    qualifies: true,
    appliedTier: null,
    unitPrice: 0,
    lineTotal: 0,
    minimumRequired: 0,
    shortfall: null,
    nextEligibleTier: null,
    warning: null,
    variantId,
    productName: variant.product.name,
    sku: variant.sku,
    strength: variant.size,
    quantity,
    effectivePriceListCode: effectiveCode,
    priceListId: priceList.id,
    priceListName: priceList.name,
    effectiveDate: priceList.effectiveDate,
    isSampleLine: true,
  };
}
