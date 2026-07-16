"use server";

import { requireUser } from "@/lib/session";
import { getWizardCatalog, type CatalogProduct } from "@/lib/data/catalog";
import type { PriceListCode } from "@prisma/client";

export async function fetchCatalogForWizard(priceListCode: PriceListCode): Promise<CatalogProduct[]> {
  await requireUser();
  return getWizardCatalog(priceListCode);
}
