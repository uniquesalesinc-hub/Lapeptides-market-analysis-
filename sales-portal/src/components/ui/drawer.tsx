"use client";

// Shared right-slide drawer + form primitives (drawers, not modals, per DESIGN.md).
// Extracted from the Customer 360 history tabs so the dashboard Tasks and Leads
// surfaces reuse the exact same pattern.

import { useEffect } from "react";
import { CloseIcon } from "@/components/shell/icons";

export const inputClass =
  "min-h-touch w-full rounded-[10px] border border-lap-border bg-lap-surface px-3 py-2 text-sm text-lap-ink placeholder:text-lap-slate/70 focus:border-lap-teal focus:outline-none focus:ring-2 focus:ring-lap-teal-bright/40";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-lap-slate">{label}</span>
      {children}
    </label>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div className={open ? "" : "pointer-events-none"} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-lap-teal-dark/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto bg-lap-surface shadow-lapDrawer transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-lap-border px-4 py-3">
          <h2 className="font-heading text-lg font-semibold text-lap-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-touch w-touch items-center justify-center rounded-[10px] text-lap-slate transition-colors duration-150 hover:bg-lap-page hover:text-lap-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local now for datetime-local inputs (which take no timezone). */
export function localDateTimeNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localDateToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
