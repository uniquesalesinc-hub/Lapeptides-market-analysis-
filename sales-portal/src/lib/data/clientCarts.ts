import { prisma } from "@/lib/prisma";
import { getPricedClientCart } from "@/lib/data/clientCart";

/**
 * Admin view of open client carts (the abandoned-cart radar). A cart is "open" when it has
 * at least one item; carts live one-per-portal-user and every add/update bumps updatedAt,
 * so newest activity sorts first. Values come from getPricedClientCart - the same loader
 * the store's cart page uses - so the number an admin sees is exactly what the client sees
 * at today's prices on their assigned ladder. Admin-only by caller contract: the dashboard
 * card and its detail page both gate on the admin role before calling this.
 */

export interface OpenClientCartLine {
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
}

export interface OpenClientCartRow {
  cartId: string;
  customerId: string;
  customerName: string;
  portalUserName: string;
  assignedRepId: string;
  assignedRepName: string;
  itemCount: number;
  totalUnits: number;
  subtotal: number;
  ladderName: string;
  updatedAt: Date;
  lines: OpenClientCartLine[];
}

export interface OpenClientCarts {
  rows: OpenClientCartRow[];
  totalCount: number;
}

export async function listOpenClientCarts(limit?: number): Promise<OpenClientCarts> {
  const where = { items: { some: {} } } as const;

  const [carts, totalCount] = await Promise.all([
    prisma.clientCart.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      ...(limit ? { take: limit } : {}),
      select: {
        id: true,
        customerId: true,
        portalUserId: true,
        updatedAt: true,
        portalUser: { select: { name: true } },
        customer: {
          select: {
            businessName: true,
            assignedRepId: true,
            assignedRep: { select: { name: true } },
          },
        },
      },
    }),
    prisma.clientCart.count({ where }),
  ]);

  const rows = await Promise.all(
    carts.map(async (cart) => {
      // getPricedClientCart keys on {portalUserId, customerId} only; the rest of the
      // session shape is display data it never reads.
      const priced = await getPricedClientCart({
        id: cart.portalUserId,
        customerId: cart.customerId,
        name: cart.portalUser.name,
        email: "",
        customerName: cart.customer.businessName,
      });

      return {
        cartId: cart.id,
        customerId: cart.customerId,
        customerName: cart.customer.businessName,
        portalUserName: cart.portalUser.name,
        assignedRepId: cart.customer.assignedRepId,
        assignedRepName: cart.customer.assignedRep.name,
        itemCount: priced.items.length,
        totalUnits: priced.totalUnits,
        subtotal: priced.subtotal,
        ladderName: priced.ladderName,
        updatedAt: cart.updatedAt,
        lines: priced.items.map((line) => ({
          productName: line.productName,
          size: line.size,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        })),
      };
    })
  );

  return { rows, totalCount };
}
