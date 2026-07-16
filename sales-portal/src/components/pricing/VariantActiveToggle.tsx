"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleVariantActive } from "@/lib/actions/pricing-actions";

export function VariantActiveToggle({ variantId, isActive }: { variantId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleVariantActive(variantId, !isActive);
          router.refresh();
        })
      }
      className={`badge ${isActive ? "border-brand-success/40 bg-brand-success/10 text-brand-success" : "border-brand-slate-400/40 bg-brand-slate-400/10 text-brand-slate-400"}`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
