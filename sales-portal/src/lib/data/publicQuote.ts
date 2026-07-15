import { prisma } from "@/lib/prisma";

export async function getPublicQuoteByToken(token: string) {
  const quote = await prisma.quote.findUnique({
    where: { publicToken: token },
    include: {
      customer: true,
      owner: { select: { name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      adjustments: true,
      approvalRecord: true,
    },
  });
  if (!quote) return null;

  const isExpired = quote.expirationDate ? quote.expirationDate < new Date() : false;
  if (isExpired && quote.status !== "EXPIRED" && quote.status !== "APPROVED" && quote.status !== "DECLINED") {
    await prisma.quote.update({ where: { id: quote.id }, data: { status: "EXPIRED", expiredAt: new Date() } });
    quote.status = "EXPIRED";
  }

  if (quote.status === "SENT") {
    await prisma.$transaction([
      prisma.quote.update({ where: { id: quote.id }, data: { status: "VIEWED", viewedAt: new Date() } }),
      prisma.activityLog.create({
        data: { action: "QUOTE_VIEWED", customerId: quote.customerId, quoteId: quote.id, description: "Viewed by customer" },
      }),
    ]);
    quote.status = "VIEWED";
  }

  return quote;
}
