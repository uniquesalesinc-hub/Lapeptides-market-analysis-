"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserStatus, updateDiscountLimit } from "@/lib/actions/user-actions";
import { formatDate } from "@/lib/format";

export function RepRow({
  id,
  name,
  email,
  status,
  discountLimitPercent,
  customerCount,
  quoteCount,
  lastLoginAt,
}: {
  id: string;
  name: string;
  email: string;
  status: string;
  discountLimitPercent: number;
  customerCount: number;
  quoteCount: number;
  lastLoginAt: Date | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [limit, setLimit] = useState(discountLimitPercent);

  function toggleStatus() {
    startTransition(async () => {
      await setUserStatus(id, status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE");
      router.refresh();
    });
  }

  function saveLimit() {
    startTransition(async () => {
      await updateDiscountLimit(id, limit);
      router.refresh();
    });
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-lap-ink">{name}</p>
          <p className="text-sm text-lap-slate">{email}</p>
          <p className="text-xs text-lap-slate">
            {customerCount} customers · {quoteCount} quotes · last login {formatDate(lastLoginAt)}
          </p>
        </div>
        <span className={`badge ${status === "ACTIVE" ? "border-lap-green/40 bg-lap-green/10 text-lap-green" : "border-lap-border bg-lap-page text-lap-slate"}`}>
          {status}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <label className="text-xs text-lap-slate">Discount limit</label>
        <input
          type="number"
          min={0}
          max={100}
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="input-field !h-9 w-20 !py-1 text-center"
        />
        <span className="text-xs text-lap-slate">%</span>
        <button type="button" className="btn-secondary !min-h-0 !px-3 !py-1.5 text-xs" onClick={saveLimit} disabled={pending}>
          Save
        </button>
        <button
          type="button"
          className={`ml-auto !min-h-0 !px-3 !py-1.5 text-xs ${status === "ACTIVE" ? "btn-danger" : "btn-primary"}`}
          onClick={toggleStatus}
          disabled={pending}
        >
          {status === "ACTIVE" ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}
