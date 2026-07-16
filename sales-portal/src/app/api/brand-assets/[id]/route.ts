import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isBrandKitPendingMigration } from "@/lib/data/brand";

export const runtime = "nodejs";

/**
 * Serves brand-asset bytes out of Postgres. Auth mirrors the quote/invoice PDF routes:
 * requireUser() plus rep/admin scoping through the asset's customer (reps can only pull
 * files for their own accounts). Images render inline (thumbnails on the Brand tab);
 * PDFs download as attachments.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let asset: {
    fileName: string;
    mimeType: string;
    data: Uint8Array;
    customer: { assignedRepId: string };
  } | null;
  try {
    asset = await prisma.brandAsset.findUnique({
      where: { id },
      // Explicit select re-includes the globally omitted blob (see src/lib/prisma.ts).
      select: {
        fileName: true,
        mimeType: true,
        data: true,
        customer: { select: { assignedRepId: true } },
      },
    });
  } catch (err) {
    // Table missing pre-migration: nothing can exist yet, so 404 rather than 500.
    if (isBrandKitPendingMigration(err)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "SALES_REP" && asset.customer.assignedRepId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const disposition = asset.mimeType === "application/pdf" ? "attachment" : "inline";
  const safeName = asset.fileName.replace(/[^\w.\- ]+/g, "_");

  return new NextResponse(asset.data as unknown as BodyInit, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Cache-Control": "private, max-age=300",
      // Defense in depth for direct navigation to an uploaded SVG: no scripts may execute.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
