import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getClientSession } from "@/lib/clientSession";
import { isBrandKitPendingMigration } from "@/lib/data/brand";

export const runtime = "nodejs";

/**
 * Serves brand-asset bytes out of Postgres. Two independent auth surfaces may read here:
 *
 * 1. Staff (NextAuth session): rep/admin scoping through the asset's customer, mirroring
 *    the quote/invoice PDF routes - reps can only pull files for their own accounts. The
 *    role/status is re-checked against the database like requireUser does.
 * 2. Client portal (signed client cookie): a valid ACTIVE portal session may read only
 *    assets belonging to its OWN customer (the Phase 2 /store/account/brand thumbnails).
 *
 * Neither check ever falls through to the other's routes: this is a read-only byte route,
 * and each surface is scoped to exactly what its own pages already show.
 *
 * Images render inline (thumbnails); PDFs download as attachments.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Staff first (re-validated against the DB, mirroring requireUser without its redirect).
  const staffSession = await getSession();
  let staff: { id: string; role: string } | null = null;
  if (staffSession?.user) {
    const current = await prisma.user.findUnique({
      where: { id: staffSession.user.id },
      select: { status: true, role: true },
    });
    if (current && current.status === "ACTIVE") {
      staff = { id: staffSession.user.id, role: current.role };
    }
  }

  // Client-portal fallback: verifies cookie signature/expiry + ACTIVE status in the DB.
  const client = staff ? null : await getClientSession();
  if (!staff && !client) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let asset: {
    fileName: string;
    mimeType: string;
    data: Uint8Array;
    customerId: string;
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
        customerId: true,
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
  if (staff) {
    if (staff.role === "SALES_REP" && asset.customer.assignedRepId !== staff.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (client && asset.customerId !== client.customerId) {
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
