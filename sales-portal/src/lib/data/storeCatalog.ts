import type { PriceListCode, ProductCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getProductDetail,
  getWizardCatalog,
  type CatalogProduct,
  type ProductDetailData,
} from "@/lib/data/catalog";
import type { ClientSessionUser } from "@/lib/clientSession";

/**
 * Storefront catalog: the public/client view of the same product data the rep app uses.
 * The one hard rule here is PRICE GATING - an anonymous visitor gets names, categories,
 * and sizes with every price field null, so a dollar amount can never be serialized to a
 * logged-out page. A logged-in client gets prices from THEIR customer's assigned ladder
 * (retail band included), never a ladder they can pick.
 */

type InjectableLadder = "BULK_RETAIL" | "BULK_WHOLESALE";

const LADDER_NAMES: Record<InjectableLadder, string> = {
  BULK_RETAIL: "Bulk Retail",
  BULK_WHOLESALE: "Bulk Wholesale",
};

/** The DB column is TEXT; anything that is not the wholesale ladder browses as retail. */
export function resolveInjectableLadder(defaultPriceListCode: string | null | undefined): InjectableLadder {
  return defaultPriceListCode === "BULK_WHOLESALE" ? "BULK_WHOLESALE" : "BULK_RETAIL";
}

/** Display name for a customer's injectable ladder ("Bulk Retail" / "Bulk Wholesale"). */
export function ladderDisplayName(ladder: InjectableLadder): string {
  return LADDER_NAMES[ladder];
}

async function customerLadder(customerId: string): Promise<InjectableLadder> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { defaultPriceListCode: true },
  });
  return resolveInjectableLadder(customer?.defaultPriceListCode);
}

// ---------------------------------------------------------------------------
// Grid (store home)
// ---------------------------------------------------------------------------

export interface StoreVariantSummary {
  id: string;
  sku: string;
  size: string;
  /** Lowest priced tier on the client's ladder; null when browsing anonymously. */
  fromPrice: number | null;
}

export interface StoreProduct {
  id: string;
  name: string;
  category: ProductCategory;
  description: string | null;
  imageUrl: string | null;
  variants: StoreVariantSummary[];
  /** The default (first) variant's lowest priced tier - the card's "From $X.XX". */
  fromPrice: number | null;
}

/** Pure mapping so the price-stripping rule is unit-testable without a database. */
export function toStoreProducts(catalog: CatalogProduct[], priced: boolean): StoreProduct[] {
  return catalog.map((p) => {
    const variants = p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      fromPrice:
        priced && v.tierPrices.length > 0 ? Math.min(...v.tierPrices.map((t) => t.unitPrice)) : null,
    }));
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      imageUrl: p.imageUrl,
      variants,
      fromPrice: variants[0]?.fromPrice ?? null,
    };
  });
}

/**
 * The browsable storefront catalog. Anonymous visitors see the retail-ladder product set
 * (the widest priced set) with all price fields null; a client sees the same list priced
 * from their customer's assigned ladder.
 */
export async function getStoreCatalog(session: ClientSessionUser | null): Promise<StoreProduct[]> {
  const ladder: PriceListCode = session ? await customerLadder(session.customerId) : "BULK_RETAIL";
  const catalog = await getWizardCatalog(ladder);
  return toStoreProducts(catalog, session !== null);
}

// ---------------------------------------------------------------------------
// Search index (masthead overlay) - never carries prices, for anyone
// ---------------------------------------------------------------------------

export interface StoreSearchItem {
  id: string;
  name: string;
  category: ProductCategory;
  sizes: string[];
  skus: string[];
}

/**
 * Lightweight name/SKU index for the masthead search overlay. Deliberately unpriced for
 * every session type: the overlay routes to the product page, where pricing renders under
 * the normal gate. One cheap query, safe to fetch in the store layout on every page.
 */
export async function getStoreSearchIndex(): Promise<StoreSearchItem[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { size: true, sku: true },
      },
    },
    orderBy: { name: "asc" },
  });
  return products
    .filter((p) => p.variants.length > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      sizes: p.variants.map((v) => v.size),
      skus: p.variants.map((v) => v.sku),
    }));
}

// ---------------------------------------------------------------------------
// Product detail
// ---------------------------------------------------------------------------

export interface StoreTierBand {
  tierNumber: number;
  label: string;
  minQty: number;
  maxQty: number | null;
  /** Null when browsing anonymously - the band structure shows, the number does not. */
  unitPrice: number | null;
}

export interface StoreVariantDetail {
  id: string;
  sku: string;
  size: string;
  bands: StoreTierBand[];
}

export interface StoreProductDetailData {
  id: string;
  name: string;
  category: ProductCategory;
  description: string | null;
  imageUrl: string | null;
  variants: StoreVariantDetail[];
  pricingVisible: boolean;
  /** "Bulk Retail" / "Bulk Wholesale" when logged in; null anonymously. */
  ladderName: string | null;
}

/** Pure mapping, unit-tested: picks the ladder's variants and strips prices when unpriced. */
export function toStoreDetail(
  detail: ProductDetailData,
  ladder: InjectableLadder,
  priced: boolean
): StoreProductDetailData {
  // Anonymous browse falls back to the other ladder's band STRUCTURE if the retail ladder
  // has no entries for this product; prices are null either way, so nothing can leak.
  let variants = detail.byLadder[ladder];
  if (!priced && variants.length === 0) {
    variants = detail.byLadder[ladder === "BULK_RETAIL" ? "BULK_WHOLESALE" : "BULK_RETAIL"];
  }

  return {
    id: detail.id,
    name: detail.name,
    category: detail.category,
    description: detail.description,
    imageUrl: detail.imageUrl,
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      bands: v.tierPrices.map((t) => ({
        tierNumber: t.tierNumber,
        label: t.label,
        minQty: t.minQty,
        maxQty: t.maxQty,
        unitPrice: priced ? t.unitPrice : null,
      })),
    })),
    pricingVisible: priced,
    ladderName: priced ? LADDER_NAMES[ladder] : null,
  };
}

/**
 * One product for /store/products/[id]. Null (page 404s) for unknown, inactive, or
 * entirely unpriced products - same visibility rule as the rep detail page.
 */
export async function getStoreProductDetail(
  productId: string,
  session: ClientSessionUser | null
): Promise<StoreProductDetailData | null> {
  const detail = await getProductDetail(productId);
  if (!detail) return null;
  const ladder = session ? await customerLadder(session.customerId) : "BULK_RETAIL";
  return toStoreDetail(detail, ladder, session !== null);
}
