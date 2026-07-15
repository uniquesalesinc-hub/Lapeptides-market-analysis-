"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function CustomerSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(defaultValue ?? "");
  const [, startTransition] = useTransition();

  return (
    <input
      type="search"
      inputMode="search"
      placeholder="Search customers…"
      className="input-field"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        const next = new URLSearchParams(params.toString());
        if (e.target.value) next.set("q", e.target.value);
        else next.delete("q");
        startTransition(() => router.push(`${pathname}?${next.toString()}`));
      }}
    />
  );
}
