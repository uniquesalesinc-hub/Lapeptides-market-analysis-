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
      className={`badge ${isActive ? "border-lap-green/40 bg-lap-green/10 text-lap-green" : "border-lap-border bg-lap-page text-lap-slate"}`}
    >
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
