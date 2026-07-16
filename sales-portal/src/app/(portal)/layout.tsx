import { requireUser } from "@/lib/session";
import { getEffectiveViewer } from "@/lib/viewAs";
import { listActiveSalesRepNames } from "@/lib/data/users";
import { listCustomerNamesByRecentActivity } from "@/lib/data/customers";
import { AppSidebar, type ViewSwitchData } from "@/components/shell/AppSidebar";
import { TopBar } from "@/components/shell/TopBar";
import { ViewAsBanner } from "@/components/shell/ViewAsBanner";
import { MobileNav } from "@/components/shell/MobileNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // The shell renders against the REAL session (an admin viewing-as still holds the admin
  // role); only the viewing-as marker and the sidebar's view-switch lists come from the
  // effective viewer. Data scoping happens per-page via getEffectiveViewer().
  const user = await requireUser();
  const viewer = await getEffectiveViewer();
  const viewingAs = viewer.viewAs ?? null;

  let viewSwitch: ViewSwitchData | undefined;
  if (user.role === "ADMIN") {
    const [reps, customers] = await Promise.all([
      listActiveSalesRepNames(),
      listCustomerNamesByRecentActivity(30),
    ]);
    viewSwitch = { reps, customers, activeRepId: viewingAs ? viewer.id : null };
  }

  return (
    <div className="min-h-dvh">
      <AppSidebar role={user.role} viewSwitch={viewSwitch} />
      <div className="flex min-h-dvh flex-col md:pl-16 xl:pl-[232px]">
        <TopBar userName={user.name} role={user.role} viewingAsName={viewingAs?.repName} />
        {viewingAs && <ViewAsBanner repName={viewingAs.repName} />}
        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-6 w-full max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
      <MobileNav role={user.role} viewSwitch={viewSwitch} />
    </div>
  );
}
