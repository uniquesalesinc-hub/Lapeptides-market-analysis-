import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { mapInvoiceToPdfData } from "@/lib/pdf/mapToPdfData";
import { InvoicePdfDocument } from "@/lib/pdf/InvoicePdfDocument";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { ownerId: true, customerId: true } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "SALES_REP" && invoice.ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await mapInvoiceToPdfData(id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await renderToBuffer(<InvoicePdfDocument data={data} />);

  await prisma.activityLog.create({
    data: { action: "DOCUMENT_DOWNLOADED", actorId: user.id, invoiceId: id, customerId: invoice.customerId, description: "Invoice PDF downloaded" },
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.invoiceNumber}.pdf"`,
    },
  });
}
