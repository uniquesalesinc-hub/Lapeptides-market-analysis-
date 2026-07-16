"use client";

import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { NAV_ITEMS, type PortalRole } from "./navItems";
import { ChevronRightIcon } from "./icons";

const SEGMENT_LABELS: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.href.slice(1), item.label]),
);
Object.assign(SEGMENT_LABELS, { new: "New", reps: "Team", edit: "Edit" });

function segmentLabel(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  // Ids and tokens stay short; plain slugs get title case.
  if (segment.length > 14) return "Detail";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function TopBar({ userName, role }: { userName?: string | null; role: PortalRole }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-lap-border bg-lap-surface/95 px-4 backdrop-blur md:px-8">
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-sm text-lap-slate">
          {segments.map((segment, i) => {
            const last = i === segments.length - 1;
            return (
              <li
                key={`${segment}-${i}`}
                className={`items-center gap-1.5 ${last ? "flex min-w-0" : "hidden sm:flex"}`}
                aria-current={last ? "page" : undefined}
              >
                {i > 0 && (
                  <ChevronRightIcon
                    className="hidden h-3.5 w-3.5 shrink-0 text-lap-border sm:block"
                    aria-hidden="true"
                  />
                )}
                <span className={`truncate ${last ? "font-heading font-semibold text-lap-ink" : ""}`}>
                  {segmentLabel(segment)}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-2 text-sm text-lap-slate sm:flex">
          {userName}
          <span className="inline-flex items-center rounded-full bg-lap-teal-wash px-2.5 py-0.5 text-xs font-semibold text-lap-teal">
            {role === "ADMIN" ? "Admin" : "Sales Rep"}
          </span>
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
