import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { mapQuoteToPdfData } from "@/lib/pdf/mapToPdfData";
import { QuotePdfDocument } from "@/lib/pdf/QuotePdfDocument";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const quote = await prisma.quote.findUnique({ where: { id }, select: { ownerId: true, customerId: true } });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "SALES_REP" && quote.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await mapQuoteToPdfData(id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await renderToBuffer(<QuotePdfDocument data={data} />);

  await prisma.activityLog.create({
    data: { action: "DOCUMENT_DOWNLOADED", actorId: user.id, quoteId: id, customerId: quote.customerId, description: `Quote PDF downloaded` },
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.quoteNumber}.pdf"`,
    },
  });
}
