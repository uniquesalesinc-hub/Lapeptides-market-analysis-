import { z } from "zod";

// Brand kit limits shared by server actions and the client-side upload form.
export const BRAND_ASSET_MAX_BYTES = 8 * 1024 * 1024; // 8 MB
export const BRAND_ASSET_MAX_MB = 8;

/** Server-side allow-list. The file input's accept attribute mirrors these extensions. */
export const BRAND_ASSET_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "application/pdf",
] as const;

export const BRAND_ASSET_KINDS = ["LOGO", "SOCIAL_MEDIA", "VIAL_LABEL", "OTHER"] as const;
export type BrandAssetKindValue = (typeof BRAND_ASSET_KINDS)[number];

export const BRAND_ASSET_KIND_LABELS: Record<BrandAssetKindValue, string> = {
  LOGO: "Logo",
  SOCIAL_MEDIA: "Social media",
  VIAL_LABEL: "Vial label",
  OTHER: "Other",
};

/** Exact 6-digit hex like #0C535E, or empty (clears the value). */
const hexField = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a 6-digit hex value like #0C535E.")
  .or(z.literal(""));

export const brandDetailsSchema = z.object({
  customerId: z.string().min(1),
  brandPrimaryHex: hexField,
  brandSecondaryHex: hexField,
  brandAccentHex: hexField,
  brandFontNotes: z.string().trim().max(2000, "Keep font notes under 2000 characters.").optional(),
  brandNotes: z.string().trim().max(2000, "Keep brand notes under 2000 characters.").optional(),
});

export type BrandDetailsInput = z.infer<typeof brandDetailsSchema>;

/** Upload metadata; the file itself is validated separately in the action. */
export const brandUploadSchema = z.object({
  customerId: z.string().min(1),
  kind: z.enum(BRAND_ASSET_KINDS),
  note: z.string().trim().max(300, "Keep the note under 300 characters.").optional(),
});

/**
 * Client-portal upload metadata: same kinds and limits, but NO customerId field - the
 * action takes it from the client session only, so the form can never target another
 * customer. Note cap is lower because the provenance prefix is prepended server-side.
 */
export const clientBrandUploadSchema = z.object({
  kind: z.enum(BRAND_ASSET_KINDS),
  note: z.string().trim().max(240, "Keep the note under 240 characters.").optional(),
});
