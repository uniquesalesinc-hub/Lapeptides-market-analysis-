import type { ProductCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveLineItemPricing } from "@/lib/pricing/resolve";
import { resolveInjectableLadder, ladderDisplayName } from "@/lib/data/storeCatalog";
import { clientOrderMinimumShortfall } from "@/lib/clientOrder";
import type { ClientSessionUser } from "@/lib/clientSession";

/**
 * The priced view of a client's server-side cart. Pricing is NEVER stored on the cart -
 * every read re-resolves each line through resolveLineItemPricing (the same authoritative
 * path rep quotes use) on the customer's assigned ladder, with tier qualification measured
 * against the POOLED unit total of the whole cart (capsules qualify on their own quantity;
 * that exemption lives inside resolveLineItemPricing). There is no samples concept in the
 * client cart, so every unit both pools and counts toward the 20-unit order minimum.
 */

export interface PricedClientCartLine {
  itemId: string;
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  sku: string;
  category: ProductCategory;
  quantity: number;
  note: string | null;
  /** Null when the line failed to price (inactive product, missing list entry). */
  unitPrice: number | null;
  lineTotal: number | null;
  tierLabel: string | null;
  qualifies: boolean;
  warning: string | null;
}

export interface PricedClientCart {
  items: PricedClientCartLine[];
  totalUnits: number;
  /** Sum of the qualifying line totals - the number checkout will re-derive. */
  subtotal: number;
  ladderName: string;
  allLinesQualify: boolean;
  /** Units still needed to reach the 20-unit order minimum; 0 when ready. */
  minimumShortfall: number;
}

export async function getPricedClientCart(session: ClientSessionUser): Promise<PricedClientCart> {
  const [cart, customer] = await Promise.all([
    prisma.clientCart.findUnique({
      where: { portalUserId: session.id },
      include: {
        items: {
          include: { productVariant: { include: { product: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.customer.findUnique({
      where: { id: session.customerId },
      select: { defaultPriceListCode: true },
    }),
  ]);

  const ladder = resolveInjectableLadder(customer?.defaultPriceListCode);
  const items = cart?.items ?? [];
  const pooledQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const lines: PricedClientCartLine[] = await Promise.all(
    items.map(async (item) => {
      const base = {
        itemId: item.id,
        variantId: item.productVariantId,
        productId: item.productVariant.productId,
        productName: item.productVariant.product.name,
        size: item.productVariant.size,
        sku: item.productVariant.sku,
        category: item.productVariant.product.category,
        quantity: item.quantity,
        note: item.note,
      };
      try {
        const resolved = await resolveLineItemPricing(item.productVariantId, item.quantity, ladder, pooledQuantity);
        if (!resolved) {
          return { ...base, unitPrice: null, lineTotal: null, tierLabel: null, qualifies: false, warning: "This product is not available right now." };
        }
        return {
          ...base,
          unitPrice: resolved.qualifies ? resolved.unitPrice : null,
          lineTotal: resolved.qualifies ? resolved.lineTotal : null,
          tierLabel: resolved.appliedTier?.label ?? null,
          qualifies: resolved.qualifies,
          warning: resolved.warning,
        };
      } catch {
        // calculateLineItemPricing throws when a qualifying tier has no list entry for this
        // variant - surface it as an unpriced line instead of failing the whole cart page.
        return { ...base, unitPrice: null, lineTotal: null, tierLabel: null, qualifies: false, warning: "This product could not be priced on your account. Contact the LA Peptides team." };
      }
    })
  );

  const subtotal = lines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0);

  return {
    items: lines,
    totalUnits: pooledQuantity,
    subtotal: Math.round(subtotal * 100) / 100,
    ladderName: ladderDisplayName(ladder),
    allLinesQualify: lines.every((l) => l.qualifies),
    minimumShortfall: clientOrderMinimumShortfall(pooledQuantity),
  };
}
