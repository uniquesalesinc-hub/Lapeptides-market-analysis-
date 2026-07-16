"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isBrandKitPendingMigration } from "@/lib/data/brand";
import {
  BRAND_ASSET_MAX_BYTES,
  BRAND_ASSET_MAX_MB,
  BRAND_ASSET_MIME_TYPES,
  brandDetailsSchema,
  brandUploadSchema,
} from "@/lib/validation/brand";

export interface BrandActionResult {
  ok: boolean;
  error?: string;
}

const PENDING_MIGRATION_ERROR =
  "Brand kit storage is pending a database migration. Try again after the next deploy.";

/**
 * Rep/admin scoping for every brand-kit mutation, mirroring getCustomer360 exactly:
 * reps may touch only customers where assignedRepId is their own id, admins may touch any.
 * Brand details and files are operational data reps collect in the field.
 */
async function requireCustomerBrandAccess(customerId: string) {
  const user = await requireUser();
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, assignedRepId: true },
  });
  if (!customer) return { user, error: "Customer not found." };
  if (user.role === "SALES_REP" && customer.assignedRepId !== user.id) {
    return { user, error: "You do not have access to this customer." };
  }
  return { user, error: null };
}

/** Upload one brand file (PNG/JPEG/SVG/PDF, max 8 MB) into the customer's brand kit. */
export async function uploadBrandAsset(formData: FormData): Promise<BrandActionResult> {
  const parsed = brandUploadSchema.safeParse({
    customerId: String(formData.get("customerId") ?? ""),
    kind: formData.get("kind"),
    note: String(formData.get("note") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid upload details." };
  }

  const { user, error } = await requireCustomerBrandAccess(parsed.data.customerId);
  if (error) return { ok: false, error };

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

  try {
    await prisma.brandAsset.create({
      data: {
        customerId: parsed.data.customerId,
        kind: parsed.data.kind,
        fileName: file.name || "untitled",
        mimeType: file.type,
        sizeBytes: file.size,
        data: Buffer.from(await file.arrayBuffer()),
        uploadedById: user.id,
        note: parsed.data.note ?? null,
      },
      select: { id: true }, // never read the blob back
    });
  } catch (err) {
    if (isBrandKitPendingMigration(err)) return { ok: false, error: PENDING_MIGRATION_ERROR };
    console.error("[brand:upload-failed]", err);
    return { ok: false, error: "Could not save the file. Please try again." };
  }

  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { ok: true };
}

/** Delete a brand asset. Allowed for admins or the original uploader only. */
export async function deleteBrandAsset(id: string): Promise<BrandActionResult> {
  const user = await requireUser();

  let asset: { customerId: string; uploadedById: string | null } | null;
  try {
    asset = await prisma.brandAsset.findUnique({
      where: { id },
      select: { customerId: true, uploadedById: true },
    });
  } catch (err) {
    if (isBrandKitPendingMigration(err)) return { ok: false, error: PENDING_MIGRATION_ERROR };
    throw err;
  }
  if (!asset) return { ok: false, error: "File not found." };
  if (user.role !== "ADMIN" && asset.uploadedById !== user.id) {
    return { ok: false, error: "Only an admin or the original uploader can delete this file." };
  }

  try {
    await prisma.brandAsset.delete({ where: { id }, select: { id: true } });
  } catch (err) {
    console.error("[brand:delete-failed]", err);
    return { ok: false, error: "Could not delete the file. Please try again." };
  }

  revalidatePath(`/customers/${asset.customerId}`);
  return { ok: true };
}

/** Save the structured brand details (hex colors, font notes, brand notes) on a customer. */
export async function updateBrandDetails(input: unknown): Promise<BrandActionResult> {
  const parsed = brandDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid brand details." };
  }

  const { error } = await requireCustomerBrandAccess(parsed.data.customerId);
  if (error) return { ok: false, error };

  const data = parsed.data;
  try {
    await prisma.customer.update({
      where: { id: data.customerId },
      data: {
        brandPrimaryHex: data.brandPrimaryHex || null,
        brandSecondaryHex: data.brandSecondaryHex || null,
        brandAccentHex: data.brandAccentHex || null,
        brandFontNotes: data.brandFontNotes?.trim() || null,
        brandNotes: data.brandNotes?.trim() || null,
      },
      select: { id: true },
    });
  } catch (err) {
    if (isBrandKitPendingMigration(err)) return { ok: false, error: PENDING_MIGRATION_ERROR };
    console.error("[brand:details-failed]", err);
    return { ok: false, error: "Could not save the brand details. Please try again." };
  }

  revalidatePath(`/customers/${data.customerId}`);
  return { ok: true };
}
