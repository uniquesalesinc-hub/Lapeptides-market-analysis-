"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BrandAssetSummary, BrandKitData } from "@/lib/data/brand";
import { isClientPortalUpload } from "@/lib/data/brand";
import { deleteClientBrandAsset, uploadClientBrandAsset } from "@/lib/actions/client-brand-actions";
import {
  BRAND_ASSET_KIND_LABELS,
  BRAND_ASSET_KINDS,
  BRAND_ASSET_MAX_BYTES,
  BRAND_ASSET_MAX_MB,
  type BrandAssetKindValue,
} from "@/lib/validation/brand";
import { formatDate } from "@/lib/format";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const COLOR_FIELDS = [
  { name: "brandPrimaryHex", label: "Primary" },
  { name: "brandSecondaryHex", label: "Secondary" },
  { name: "brandAccentHex", label: "Accent" },
] as const;

const ASSET_SECTIONS: Array<{ kind: BrandAssetKindValue; title: string; empty: string }> = [
  { kind: "LOGO", title: "Logo", empty: "No logo uploaded yet." },
  { kind: "SOCIAL_MEDIA", title: "Social media", empty: "No social media assets yet." },
  { kind: "VIAL_LABEL", title: "Vial labels", empty: "No vial labels yet." },
  { kind: "OTHER", title: "Other", empty: "No other files yet." },
];

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/**
 * Client-portal brand kit: read-only brand colors plus the shared asset folder. Uploads run
 * through uploadClientBrandAsset (session-scoped, provenance-noted); delete appears only on
 * files this portal uploaded - team uploads are read-only here.
 */
export function ClientBrandKit({ brand }: { brand: BrandKitData }) {
  if (brand.status === "pending_migration") {
    return (
      <p className="rounded-[10px] border border-lap-border bg-lap-page p-8 text-center text-sm text-lap-slate">
        Your brand kit is being set up. Check back soon.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ColorsCard details={brand.details} />
      <AssetsPanel assets={brand.assets} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brand colors (read-only for clients)
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

function ColorsCard({ details }: { details: Extract<BrandKitData, { status: "ok" }>["details"] }) {
  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-page p-5">
      <h2 className="text-xs font-medium uppercase tracking-wide text-lap-slate">Brand colors</h2>
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
      <p className="mt-3 text-xs text-lap-slate">
        Colors are managed with the LA Peptides team so print production always matches.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

function AssetsPanel({ assets }: { assets: BrandAssetSummary[] }) {
  return (
    <div className="space-y-6">
      <UploadCard />
      {ASSET_SECTIONS.map((section) => {
        const rows = assets.filter((a) => a.kind === section.kind);
        return (
          <section key={section.kind}>
            <h3 className="border-b border-lap-border pb-1.5 text-xs font-medium uppercase tracking-wide text-lap-slate">
              {section.title}
              <span className="ml-1.5 font-mono normal-case">{rows.length}</span>
            </h3>
            {rows.length === 0 ? (
              <p className="py-3 text-sm text-lap-slate">{section.empty}</p>
            ) : (
              <ul className="divide-y divide-lap-border">
                {rows.map((asset) => (
                  <AssetRow key={asset.id} asset={asset} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function AssetRow({ asset }: { asset: BrandAssetSummary }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = asset.mimeType.startsWith("image/");
  const href = `/api/brand-assets/${asset.id}`;
  // Clients may remove only what their portal uploaded; team files are read-only here.
  const canDelete = isClientPortalUpload(asset.note);

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteClientBrandAsset(asset.id);
      if (!result.ok) {
        setError(result.error ?? "Could not delete the file.");
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 py-3" data-testid={`brand-asset-${asset.id}`}>
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
        <p className="truncate text-sm font-medium text-lap-ink">{asset.fileName}</p>
        <p className="mt-0.5 text-xs text-lap-slate">
          {formatFileSize(asset.sizeBytes)}
          {` · ${formatDate(asset.createdAt)}`}
          {canDelete ? "" : " · Added by the LA Peptides team"}
        </p>
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
              data-testid={`brand-asset-delete-${asset.id}`}
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
// Upload
// ---------------------------------------------------------------------------

function UploadCard() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setUploaded(false);

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

    startTransition(async () => {
      const result = await uploadClientBrandAsset(form);
      if (!result.ok) {
        setError(result.error ?? "Could not upload the file.");
        return;
      }
      formRef.current?.reset();
      setUploaded(true);
      router.refresh();
    });
  }

  return (
    <section className="rounded-[10px] border border-lap-border bg-lap-surface p-5 shadow-lap">
      <h2 className="font-heading text-base font-semibold text-lap-ink">Upload a file</h2>
      <p className="mt-1 text-sm text-lap-slate">
        Logos, social artwork, or vial label files. PNG, JPEG, SVG, or PDF, up to {BRAND_ASSET_MAX_MB} MB.
      </p>
      <form ref={formRef} onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-lap-slate">
              Type
            </span>
            <select
              name="kind"
              defaultValue="LOGO"
              className="min-h-touch w-full rounded-[10px] border border-lap-border bg-lap-surface px-3 text-sm text-lap-ink focus:border-lap-teal focus:outline-none focus:ring-2 focus:ring-lap-teal-bright/30"
            >
              {BRAND_ASSET_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {BRAND_ASSET_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-lap-slate">
              File
            </span>
            <input
              ref={fileRef}
              name="file"
              type="file"
              required
              accept=".png,.jpg,.jpeg,.svg,.pdf"
              className="min-h-touch w-full rounded-[10px] border border-lap-border bg-lap-surface px-3 py-2.5 text-sm text-lap-ink file:mr-3 file:rounded-[8px] file:border-0 file:bg-lap-teal-wash file:px-3 file:py-1 file:text-xs file:font-semibold file:text-lap-teal"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-lap-slate">
            Note (optional)
          </span>
          <input
            name="note"
            maxLength={240}
            placeholder="e.g. New label art for 2026"
            className="min-h-touch w-full rounded-[10px] border border-lap-border bg-lap-surface px-3 text-sm text-lap-ink focus:border-lap-teal focus:outline-none focus:ring-2 focus:ring-lap-teal-bright/30"
          />
        </label>
        {error && (
          <p className="rounded-lg bg-lap-red/10 px-3 py-2 text-xs font-medium text-lap-red" role="alert">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            data-testid="brand-upload-submit"
            className="min-h-touch rounded-[10px] bg-lap-teal px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-lap-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Uploading..." : "Upload file"}
          </button>
          {uploaded && !pending && <span className="text-xs font-medium text-lap-green">Uploaded.</span>}
        </div>
      </form>
    </section>
  );
}
