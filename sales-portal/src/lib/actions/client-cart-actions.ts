"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/clientSession";

/**
 * Client-portal cart actions. Every entry point runs behind requireClient (the storefront
 * session, never the rep/admin session), and the cart stores ONLY {variant, quantity, note}:
 * pricing is recomputed server-side on the customer's assigned ladder at render and at
 * checkout, so a stale cart can never lock in an old price. Task 4 adds update/remove/
 * checkout; this is the add path for the product-page stub.
 */

export interface ClientCartActionResult {
  ok: boolean;
  error?: string;
  /** Total units across the cart after the mutation. */
  cartUnits?: number;
}

const addToCartSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(9999),
});

export async function addToClientCart(input: unknown): Promise<ClientCartActionResult> {
  const session = await requireClient();

  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a quantity of at least 1." };
  const { variantId, quantity } = parsed.data;

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, isActive: true, product: { select: { isActive: true } } },
  });
  if (!variant || !variant.isActive || !variant.product.isActive) {
    return { ok: false, error: "This product is not available right now." };
  }

  try {
    // One cart per portal user (portalUserId is unique). The empty update still bumps
    // updatedAt, which is what the Task 5 abandoned-carts view sorts on.
    const cart = await prisma.clientCart.upsert({
      where: { portalUserId: session.id },
      create: { portalUserId: session.id, customerId: session.customerId },
      update: {},
      select: { id: true },
    });

    await prisma.clientCartItem.upsert({
      where: { cartId_productVariantId: { cartId: cart.id, productVariantId: variantId } },
      create: { cartId: cart.id, productVariantId: variantId, quantity },
      update: { quantity: { increment: quantity } },
    });

    const units = await prisma.clientCartItem.aggregate({
      where: { cartId: cart.id },
      _sum: { quantity: true },
    });

    revalidatePath("/store/cart");
    return { ok: true, cartUnits: units._sum.quantity ?? quantity };
  } catch (err) {
    console.error("[client-cart:add-failed]", err);
    return { ok: false, error: "Could not add to cart. Please try again." };
  }
}
