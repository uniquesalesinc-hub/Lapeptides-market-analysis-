"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProductDescription } from "@/lib/actions/pricing-actions";

export function ProductDescriptionForm({
  productId,
  description,
  internalNotes,
}: {
  productId: string;
  description: string;
  internalNotes: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateProductDescription(productId, {
        description: String(formData.get("description") || ""),
        internalNotes: String(formData.get("internalNotes") || ""),
      });
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-4">
      <div>
        <label className="label-text">Customer-facing description</label>
        <p className="mb-1 text-xs text-lap-slate">
          No medical, treatment, or dosage claims - research-use-only language only.
        </p>
        <textarea name="description" defaultValue={description} rows={3} className="input-field !h-auto py-2" />
      </div>
      <div>
        <label className="label-text">Internal notes (never shown to customers)</label>
        <textarea name="internalNotes" defaultValue={internalNotes} rows={3} className="input-field !h-auto py-2" />
      </div>
      {saved && <p className="text-sm text-lap-green">Saved.</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
