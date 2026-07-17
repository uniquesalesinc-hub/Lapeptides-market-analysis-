"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/clientSession";
import {
  CLIENT_PORTAL_UPLOAD_PREFIX,
  isBrandKitPendingMigration,
  isClientPortalUpload,
} from "@/lib/data/brand";
import {
  BRAND_ASSET_MAX_BYTES,
  BRAND_ASSET_MAX_MB,
  BRAND_ASSET_MIME_TYPES,
  clientBrandUploadSchema,
} from "@/lib/validation/brand";
import type { BrandActionResult } from "@/lib/actions/brand-actions";

/**
 * Client-portal brand-kit actions. The staff surface (brand-actions.ts) scopes by rep/admin
 * role; here every entry point runs behind requireClient and the customerId comes from the
 * SESSION ONLY - never from the form - so a portal user can only ever touch their own
 * customer's brand kit. Uploads record provenance in the note (uploadedById is the staff
 * User table, so it stays null for portal users), and clients may delete only their own
 * portal's uploads: staff-uploaded files are read-only on this surface.
 */

const PENDING_MIGRATION_ERROR =
  "Brand kit storage is pending a database migration. Try again after the next deploy.";

function revalidateBrandViews(customerId: string) {
  revalidatePath("/store/account/brand");
  revalidatePath(`/customers/${customerId}`); // staff Brand tab shows the same folder
}

/** Upload one brand file (PNG/JPEG/SVG/PDF, max 8 MB) into the session customer's brand kit. */
export async function uploadClientBrandAsset(formData: FormData): Promise<BrandActionResult> {
  const session = await requireClient();

  const parsed = clientBrandUploadSchema.safeParse({
    kind: formData.get("kind"),
    note: String(formData.get("note") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid upload details." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }
  if (!(BRAND_ASSET_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Only PNG, JPEG, SVG, or PDF files are accepted." };
  }
  if (file.size > BRAND_ASSET_MAX_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      ok: false,
      error: `That file is ${sizeMb} MB. The limit is ${BRAND_ASSET_MAX_MB} MB per file.`,
    };
  }

  const provenance = `${CLIENT_PORTAL_UPLOAD_PREFIX} by ${session.name}`;
  const note = parsed.data.note ? `${provenance} - ${parsed.data.note}` : provenance;

  try {
    await prisma.brandAsset.create({
      data: {
        customerId: session.customerId,
        kind: parsed.data.kind,
        fileName: file.name || "untitled",
        mimeType: file.type,
        sizeBytes: file.size,
        data: Buffer.from(await file.arrayBuffer()),
        uploadedById: null,
        note,
      },
      select: { id: true }, // never read the blob back
    });
  } catch (err) {
    if (isBrandKitPendingMigration(err)) return { ok: false, error: PENDING_MIGRATION_ERROR };
    console.error("[client-brand:upload-failed]", err);
    return { ok: false, error: "Could not save the file. Please try again." };
  }

  revalidateBrandViews(session.customerId);
  return { ok: true };
}

/**
 * Delete a brand asset from the client portal. Only assets that belong to the session's own
 * customer AND were uploaded via the client portal (provenance note) may be deleted here.
 */
export async function deleteClientBrandAsset(id: string): Promise<BrandActionResult> {
  const session = await requireClient();

  let asset: { customerId: string; note: string | null } | null;
  try {
    asset = await prisma.brandAsset.findUnique({
      where: { id },
      select: { customerId: true, note: true },
    });
  } catch (err) {
    if (isBrandKitPendingMigration(err)) return { ok: false, error: PENDING_MIGRATION_ERROR };
    throw err;
  }
  // Same response for "not yours" and "not found": no existence oracle across customers.
  if (!asset || asset.customerId !== session.customerId) {
    return { ok: false, error: "File not found." };
  }
  if (!isClientPortalUpload(asset.note)) {
    return { ok: false, error: "Files added by the LA Peptides team can only be removed by them." };
  }

  try {
    await prisma.brandAsset.delete({ where: { id }, select: { id: true } });
  } catch (err) {
    console.error("[client-brand:delete-failed]", err);
    return { ok: false, error: "Could not delete the file. Please try again." };
  }

  revalidateBrandViews(session.customerId);
  return { ok: true };
}
