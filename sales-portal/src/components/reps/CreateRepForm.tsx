"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSalesRep } from "@/lib/actions/user-actions";

export function CreateRepForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createSalesRep({
        name: String(formData.get("name") || ""),
        email: String(formData.get("email") || ""),
        discountLimitPercent: Number(formData.get("discountLimitPercent") || 5),
      });
      if (!result.ok) {
        setError(result.message ?? "Could not create representative.");
        return;
      }
      setTempPassword(result.temporaryPassword ?? null);
      router.refresh();
    });
  }

  if (tempPassword) {
    return (
      <div className="card border-lap-green/40 bg-lap-green/10 p-4">
        <p className="font-semibold text-lap-green">Sales representative created.</p>
        <p className="mt-1 text-sm text-lap-slate">
          Temporary password (share securely - shown only once):
        </p>
        <p className="mt-1 font-mono text-sm text-lap-ink">{tempPassword}</p>
        <button
          type="button"
          className="btn-secondary mt-3 w-full"
          onClick={() => {
            setTempPassword(null);
            setOpen(false);
          }}
        >
          Done
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary w-full" onClick={() => setOpen(true)}>
        + Add Sales Representative
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-4">
      <div>
        <label className="label-text">Name</label>
        <input name="name" required className="input-field" />
      </div>
      <div>
        <label className="label-text">Email</label>
        <input name="email" type="email" inputMode="email" required className="input-field" />
      </div>
      <div>
        <label className="label-text">Discount limit (%)</label>
        <input name="discountLimitPercent" type="number" min={0} max={100} defaultValue={5} className="input-field" />
      </div>
      {error && <p className="text-sm text-lap-red">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
