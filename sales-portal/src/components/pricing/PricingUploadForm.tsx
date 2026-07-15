"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewPricingUpload, publishPricingUpload, type PricingDiffRow } from "@/lib/actions/pricing-actions";
import { PRICE_LIST_LABELS } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/format";
import type { PriceListCode } from "@prisma/client";

export function PricingUploadForm() {
  const router = useRouter();
  const [priceListCode, setPriceListCode] = useState<PriceListCode>("BULK_RETAIL");
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [diff, setDiff] = useState<PricingDiffRow[] | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [published, setPublished] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handlePreview() {
    startTransition(async () => {
      const result = await previewPricingUpload(priceListCode, csvText);
      if (!result.ok) {
        setErrors([result.message ?? "Could not parse file.", ...(result.parseErrors ?? [])]);
        setDiff(null);
        return;
      }
      setDiff(result.diff ?? []);
      setUnmatched(result.unmatchedSkus ?? []);
      setErrors(result.parseErrors ?? []);
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishPricingUpload(priceListCode, csvText, fileName || "manual-upload.csv", effectiveDate);
      if (result.ok) {
        setPublished(true);
        router.refresh();
      } else {
        setErrors([result.message ?? "Publish failed."]);
      }
    });
  }

  const changedCount = diff?.filter((d) => d.changed).length ?? 0;

  if (published) {
    return (
      <div className="card border-brand-success/40 bg-brand-success/10 p-4 text-center">
        <p className="font-semibold text-brand-success">Pricing published.</p>
        <p className="mt-1 text-sm text-brand-slate-300">
          Historical quotes and invoices keep the pricing that was active when they were created.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div>
          <label className="label-text">Price list</label>
          <select className="input-field" value={priceListCode} onChange={(e) => setPriceListCode(e.target.value as PriceListCode)}>
            {(Object.keys(PRICE_LIST_LABELS) as PriceListCode[]).map((c) => (
              <option key={c} value={c}>
                {PRICE_LIST_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-text">Effective date</label>
          <input type="date" className="input-field" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
        </div>
        <div>
          <label className="label-text">CSV file</label>
          <p className="mb-1 text-xs text-brand-slate-400">
            Format: <code>sku,tier1,tier2,...</code> — one column per tier, in tier order, matching the
            price list selected above. SKUs must match existing catalog SKUs exactly.
          </p>
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="input-field !h-auto py-2" />
        </div>
        <button type="button" className="btn-secondary w-full" onClick={handlePreview} disabled={!csvText || pending}>
          {pending ? "Analyzing…" : "Preview Changes"}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="card border-brand-danger/40 p-4 text-sm text-brand-danger">
          <ul className="list-inside list-disc">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="card border-brand-warning/40 p-4 text-sm text-brand-warning">
          <p className="font-semibold">{unmatched.length} SKU(s) not found in the catalog — skipped:</p>
          <p className="font-mono text-xs">{unmatched.join(", ")}</p>
        </div>
      )}

      {diff && (
        <div className="card p-4">
          <h2 className="mb-2 font-semibold text-white">
            {changedCount} of {diff.length} price entries will change
          </h2>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-brand-slate-400">
                  <th className="py-1 pr-3">SKU</th>
                  <th className="py-1 pr-3">Tier</th>
                  <th className="py-1 pr-3">Old</th>
                  <th className="py-1">New</th>
                </tr>
              </thead>
              <tbody>
                {diff
                  .filter((d) => d.changed)
                  .map((d, i) => (
                    <tr key={i} className="border-t border-brand-border">
                      <td className="py-1.5 pr-3 font-mono text-xs">{d.sku}</td>
                      <td className="py-1.5 pr-3 text-xs text-brand-slate-400">{d.tierLabel}</td>
                      <td className="py-1.5 pr-3 text-brand-slate-400 line-through">{d.oldPrice != null ? formatMoney(d.oldPrice) : "—"}</td>
                      <td className="py-1.5 font-semibold text-brand-teal">{formatMoney(d.newPrice)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {changedCount === 0 && <p className="text-sm text-brand-slate-400">No price changes detected.</p>}
          <button type="button" className="btn-primary mt-4 w-full" onClick={handlePublish} disabled={pending || changedCount === 0}>
            {pending ? "Publishing…" : `Confirm & Publish (effective ${effectiveDate})`}
          </button>
        </div>
      )}
    </div>
  );
}
