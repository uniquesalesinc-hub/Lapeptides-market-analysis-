import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { mapQuoteToPdfData } from "@/lib/pdf/mapToPdfData";
import { QuotePdfDocument } from "@/lib/pdf/QuotePdfDocument";

export const runtime = "nodejs";

// Public, unauthenticated download for the customer viewing their own quote via its token —
// deliberately excludes internal notes (mapQuoteToPdfData never includes them).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await prisma.quote.findUnique({ where: { publicToken: token }, select: { id: true } });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await mapQuoteToPdfData(quote.id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const buffer = await renderToBuffer(<QuotePdfDocument data={data} />);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.quoteNumber}.pdf"`,
    },
  });
}
