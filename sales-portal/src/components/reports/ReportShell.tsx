import { PageHeader } from "@/components/shell/PageHeader";
import { ReportTabs } from "./ReportTabs";
import { FilterChips, type FilterOption } from "./FilterChips";

/**
 * Shared frame for the four report tabs: header, Sales | Customers | Products | Team tabs,
 * and the filter row. Server-component friendly; pages fetch the option lists themselves
 * (they also need them to name the active rep/customer in section headings).
 */
export function ReportShell({
  description,
  actions,
  reps,
  customers,
  children,
}: {
  description: string;
  actions?: React.ReactNode;
  reps: FilterOption[];
  customers: FilterOption[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader title="Reports" description={description} actions={actions} />
      <ReportTabs />
      <FilterChips reps={reps} customers={customers} />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
