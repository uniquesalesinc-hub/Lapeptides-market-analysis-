"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BrandAssetSummary, BrandKitData } from "@/lib/data/brand";
import { deleteBrandAsset, updateBrandDetails, uploadBrandAsset } from "@/lib/actions/brand-actions";
import {
  BRAND_ASSET_KIND_LABELS,
  BRAND_ASSET_KINDS,
  BRAND_ASSET_MAX_BYTES,
  BRAND_ASSET_MAX_MB,
  type BrandAssetKindValue,
} from "@/lib/validation/brand";
import { formatDate } from "@/lib/format";
import { PlusIcon } from "@/components/shell/icons";
import { Drawer, Field, inputClass } from "@/components/ui/drawer";
import { Chip } from "./chips";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const ASSET_SECTIONS: Array<{ kind: BrandAssetKindValue; title: string; empty: string }> = [
  { kind: "LOGO", title: "Logo", empty: "No logo uploaded yet." },
  { kind: "SOCIAL_MEDIA", title: "Social media", empty: "No social media assets uploaded yet." },
  { kind: "VIAL_LABEL", title: "Vial labels", empty: "No vial labels uploaded yet." },
  { kind: "OTHER", title: "Other", empty: "No other files uploaded yet." },
];

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export interface BrandKitTabProps {
  customerId: string;
  brand: BrandKitData;
  canEdit: boolean;
  isAdmin: boolean;
  currentUserId: string;
}

/**
 * Customer 360 Brand tab: exact brand colors + notes and the per-customer asset folder
 * (logo, social media, vial labels, other) that Danny's print staff pulls from. Renders a
 * quiet pending notice until the brand-kit migration is applied to the shared database.
 */
export function BrandKitTab({ customerId, brand, canEdit, isAdmin, currentUserId }: BrandKitTabProps) {
  if (brand.status === "pending_migration") {
    return (
      <p className="py-6 text-center text-sm text-lap-slate">
        Brand kit pending database migration. This tab activates once the update is applied.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <BrandColorsCard customerId={customerId} details={brand.details} canEdit={canEdit} />
      <BrandAssetsPanel
        customerId={customerId}
        assets={brand.assets}
        canEdit={canEdit}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brand colors + notes
// ---------------------------------------------------------------------------

function Swatch({ value }: { value: string }) {
  const valid = HEX_RE.test(value);
  return (
    <span
      aria-hidden
      className="inline-block h-9 w-9 shrink-0 rounded-[8px] border border-lap-border"
      style={valid ? { backgroundColor: value } : undefined}
      title={valid ? value : "No color set"}
    />
  );
}

const COLOR_FIELDS = [
  { name: "brandPrimaryHex", label: "Primary" },
  { name: "brandSecondaryHex", label: "Secondary" },
  { name: "brandAccentHex", label: "Accent" },
] as const;

function BrandColorsCard({
  customerId,
  details,
  canEdit,
}: {
  customerId: string;
  details: Extract<BrandKitData, { status: "ok" }>["details"];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hex, setHex] = useState<Record<(typeof COLOR_FIELDS)[number]["name"], string>>({
    brandPrimaryHex: details.brandPrimaryHex ?? "",
    brandSecondaryHex: details.brandSecondaryHex ?? "",
    brandAccentHex: details.brandAccentHex ?? "",
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setSaved(false);
    for (const field of COLOR_FIELDS) {
      const value = hex[field.name].trim();
      if (value && !HEX_RE.test(value)) {
        setError(`${field.label} color must be a 6-digit hex value like #0C535E.`);
        return;
      }
    }
    startTransition(async () => {
      const result = await updateBrandDetails({
        customerId,
        brandPrimaryHex: hex.brandPrimaryHex.trim(),
        brandSecondaryHex: hex.brandSecondaryHex.trim(),
        brandAccentHex: hex.brandAccentHex.trim(),
        brandFontNotes: String(form.get("brandFontNotes") ?? ""),
        brandNotes: String(form.get("brandNotes") ?? ""),
      });
      if (!result.ok) {
        setError(result.error ?? "Could not save the brand details.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  if (!canEdit) {
    return (
      <section className="rounded-[10px] border border-lap-border bg-lap-page p-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-lap-slate">Brand colors</h3>
        <div className="mt-3 flex flex-wrap gap-6">
          {COLOR_FIELDS.map((field) => {
            const value = details[field.name] ?? "";
            return (
              <div key={field.name} className="flex items-center gap-2">
                <Swatch value={value} />
                <div>
                  <p className="text-xs text-lap-slate">{field.label}</p>
                  <p className="font-mono text-sm text-lap-ink">{value || "Not set"}</p>
                </div>
              </div>
            );
          })}
        </div>
        {details.brandFontNotes && (
          <p className="mt-3 text-sm text-lap-ink">
            <span className="text-xs font-medium uppercase tracking-wide text-lap-slate">Fonts: </span>
            {details.brandFontNotes}
          </p>
        )}
        {details.brandNotes && (
          <p className="mt-2 text-sm text-lap-ink">
            <span className="text-xs font-medium uppercase tracking-wide text-lap-slate">Notes: </span>
            {details.brandNotes}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-page p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-lap-slate">Brand colors</h3>
      <p className="mt-1 text-sm text-lap-slate">
        Exact hex values from the customer. Print production uses these verbatim, so no
        approximations.
      </p>
      <form onSubmit={submit} className="mt-3 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {COLOR_FIELDS.map((field) => (
            <label key={field.name} className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-lap-slate">
                {field.label}
              </span>
              <span className="flex items-center gap-2">
                <Swatch value={hex[field.name]} />
                <input
                  name={field.name}
                  value={hex[field.name]}
                  onChange={(e) => setHex((prev) => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder="#0C535E"
                  maxLength={7}
                  className={`${inputClass} font-mono`}
                />
              </span>
            </label>
          ))}
        </div>
        <Field label="Font notes">
          <textarea
            name="brandFontNotes"
            rows={2}
            defaultValue={details.brandFontNotes ?? ""}
            placeholder="e.g. Montserrat Bold for the wordmark, Lato for label body text"
            className={inputClass}
          />
        </Field>
        <Field label="Brand notes">
          <textarea
            name="brandNotes"
            rows={3}
            defaultValue={details.brandNotes ?? ""}
            placeholder="Anything production needs to know: clear space, do-not-stretch, foil, finishes"
            className={inputClass}
          />
        </Field>
        {error && (
          <p className="rounded-lg bg-lap-red/10 px-3 py-2 text-xs font-medium text-lap-red" role="alert">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="min-h-touch rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save brand details"}
          </button>
          {saved && !pending && <span className="text-xs font-medium text-lap-green">Saved.</span>}
        </div>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Asset sections
// ---------------------------------------------------------------------------

function BrandAssetsPanel({
  customerId,
  assets,
  canEdit,
  isAdmin,
  currentUserId,
}: {
  customerId: string;
  assets: BrandAssetSummary[];
  canEdit: boolean;
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-lap-slate">One folder per customer for label and logo production.</p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex min-h-touch items-center gap-1.5 rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark"
          >
            <PlusIcon className="h-4 w-4" />
            Upload file
          </button>
        )}
      </div>

      <div className="space-y-5">
        {ASSET_SECTIONS.map((section) => {
          const rows = assets.filter((a) => a.kind === section.kind);
          return (
            <section key={section.kind}>
              <h4 className="border-b border-lap-border pb-1.5 text-xs font-medium uppercase tracking-wide text-lap-slate">
                {section.title}
                <span className="ml-1.5 font-mono normal-case">{rows.length}</span>
              </h4>
              {rows.length === 0 ? (
                <p className="py-3 text-sm text-lap-slate">{section.empty}</p>
              ) : (
                <ul className="divide-y divide-lap-border">
                  {rows.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      canDelete={isAdmin || asset.uploadedById === currentUserId}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <UploadAssetDrawer customerId={customerId} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

function AssetRow({ asset, canDelete }: { asset: BrandAssetSummary; canDelete: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = asset.mimeType.startsWith("image/");
  const href = `/api/brand-assets/${asset.id}`;

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteBrandAsset(asset.id);
      if (!result.ok) {
        setError(result.error ?? "Could not delete the file.");
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 py-3">
      {isImage ? (
        // Plain img on purpose: next/image cannot optimize an authenticated dynamic route.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={href}
          alt={asset.fileName}
          className="h-11 w-11 shrink-0 rounded-[8px] border border-lap-border bg-white object-contain p-0.5"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-lap-border bg-lap-page font-mono text-[10px] font-semibold text-lap-slate">
          PDF
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-lap-ink">{asset.fileName}</p>
          <Chip tone="teal">{BRAND_ASSET_KIND_LABELS[asset.kind as BrandAssetKindValue] ?? asset.kind}</Chip>
        </div>
        <p className="mt-0.5 text-xs text-lap-slate">
          {formatFileSize(asset.sizeBytes)}
          {asset.uploadedByName ? ` · ${asset.uploadedByName}` : ""}
          {` · ${formatDate(asset.createdAt)}`}
        </p>
        {asset.note && <p className="mt-0.5 text-xs text-lap-slate">{asset.note}</p>}
        {error && (
          <p className="mt-1 text-xs font-medium text-lap-red" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="min-h-touch inline-flex items-center rounded-[10px] border border-lap-border px-3 text-xs font-semibold text-lap-slate transition-colors duration-150 hover:bg-lap-page"
        >
          {asset.mimeType === "application/pdf" ? "Download" : "View"}
        </a>
        {canDelete &&
          (confirming ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={remove}
                className="min-h-touch rounded-[10px] bg-lap-red px-3 text-xs font-semibold text-white transition-colors duration-150 hover:bg-lap-red/90 disabled:opacity-50"
              >
                {pending ? "Deleting..." : "Confirm"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(false)}
                className="min-h-touch rounded-[10px] border border-lap-border px-3 text-xs font-semibold text-lap-slate transition-colors duration-150 hover:bg-lap-page disabled:opacity-50"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="min-h-touch rounded-[10px] border border-lap-red/40 px-3 text-xs font-semibold text-lap-red transition-colors duration-150 hover:bg-lap-red/10"
            >
              Delete
            </button>
          ))}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Upload drawer
// ---------------------------------------------------------------------------

function UploadAssetDrawer({
  customerId,
  open,
  onClose,
}: {
  customerId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    // Mirrors the server-side limit so oversized files fail fast, before the round trip.
    if (file.size > BRAND_ASSET_MAX_BYTES) {
      setError(
        `That file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The limit is ${BRAND_ASSET_MAX_MB} MB per file.`
      );
      return;
    }

    form.set("customerId", customerId);
    startTransition(async () => {
      const result = await uploadBrandAsset(form);
      if (!result.ok) {
        setError(result.error ?? "Could not upload the file.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Drawer open={open} onClose={onClose} title="Upload brand file">
      <form onSubmit={submit} className="space-y-4 p-4">
        <Field label="Type">
          <select name="kind" defaultValue="LOGO" className={inputClass}>
            {BRAND_ASSET_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {BRAND_ASSET_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="File">
          <input
            ref={fileRef}
            name="file"
            type="file"
            required
            accept=".png,.jpg,.jpeg,.svg,.pdf"
            className={`${inputClass} py-2.5 file:mr-3 file:rounded-[8px] file:border-0 file:bg-lap-teal-wash file:px-3 file:py-1 file:text-xs file:font-semibold file:text-lap-teal`}
          />
        </Field>
        <p className="text-xs text-lap-slate">PNG, JPEG, SVG, or PDF. Max {BRAND_ASSET_MAX_MB} MB.</p>
        <Field label="Note (optional)">
          <input name="note" maxLength={300} placeholder="e.g. Approved 2026 label art" className={inputClass} />
        </Field>
        {error && (
          <p className="rounded-lg bg-lap-red/10 px-3 py-2 text-xs font-medium text-lap-red" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-touch w-full rounded-[10px] bg-lap-teal px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Uploading..." : "Upload file"}
        </button>
      </form>
    </Drawer>
  );
}
