"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/clientSession";

/**
 * Client-portal cart actions. Every entry point runs behind requireClient (the storefront
 * session, never the rep/admin session), and the cart stores ONLY {variant, quantity, note}:
 * pricing is recomputed server-side on the customer's assigned ladder at render and at
 * checkout, so a stale cart can never lock in an old price. Checkout itself lives in
 * client-order-actions.ts.
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

/**
 * Loads a cart item ONLY if it belongs to the session's own cart. Every per-item mutation
 * goes through this, so one client can never touch another client's cart rows by guessing ids.
 */
async function findOwnCartItem(itemId: string, portalUserId: string) {
  return prisma.clientCartItem.findFirst({
    where: { id: itemId, cart: { portalUserId } },
    select: { id: true, cartId: true },
  });
}

async function cartUnitCount(cartId: string): Promise<number> {
  const units = await prisma.clientCartItem.aggregate({ where: { cartId }, _sum: { quantity: true } });
  return units._sum.quantity ?? 0;
}

const updateItemSchema = z.object({
  itemId: z.string().min(1),
  // 0 is a deliberate remove; the UI's remove button and a stepped-to-zero qty share one path.
  quantity: z.number().int().min(0).max(9999),
});

export async function updateClientCartItem(input: unknown): Promise<ClientCartActionResult> {
  const session = await requireClient();

  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a quantity of 0 or more." };
  const { itemId, quantity } = parsed.data;

  const item = await findOwnCartItem(itemId, session.id);
  if (!item) return { ok: false, error: "This item is no longer in your cart." };

  try {
    if (quantity === 0) {
      await prisma.clientCartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.clientCartItem.update({ where: { id: item.id }, data: { quantity } });
    }
    // Bump the cart's updatedAt so the abandoned-carts view sees real activity.
    await prisma.clientCart.update({ where: { id: item.cartId }, data: {} });

    revalidatePath("/store/cart");
    return { ok: true, cartUnits: await cartUnitCount(item.cartId) };
  } catch (err) {
    console.error("[client-cart:update-failed]", err);
    return { ok: false, error: "Could not update your cart. Please try again." };
  }
}

const noteSchema = z.object({
  itemId: z.string().min(1),
  note: z.string().max(500, "Notes are limited to 500 characters."),
});

export async function setClientCartItemNote(input: unknown): Promise<ClientCartActionResult> {
  const session = await requireClient();

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };
  const { itemId, note } = parsed.data;

  const item = await findOwnCartItem(itemId, session.id);
  if (!item) return { ok: false, error: "This item is no longer in your cart." };

  try {
    await prisma.clientCartItem.update({
      where: { id: item.id },
      data: { note: note.trim() === "" ? null : note.trim() },
    });
    revalidatePath("/store/cart");
    return { ok: true, cartUnits: await cartUnitCount(item.cartId) };
  } catch (err) {
    console.error("[client-cart:note-failed]", err);
    return { ok: false, error: "Could not save the note. Please try again." };
  }
}

export async function clearClientCart(): Promise<ClientCartActionResult> {
  const session = await requireClient();

  try {
    const cart = await prisma.clientCart.findUnique({
      where: { portalUserId: session.id },
      select: { id: true },
    });
    if (cart) {
      await prisma.clientCartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.clientCart.update({ where: { id: cart.id }, data: {} });
    }
    revalidatePath("/store/cart");
    return { ok: true, cartUnits: 0 };
  } catch (err) {
    console.error("[client-cart:clear-failed]", err);
    return { ok: false, error: "Could not clear your cart. Please try again." };
  }
}
