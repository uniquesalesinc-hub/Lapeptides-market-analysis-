import { requireUser } from "@/lib/session";
import { AppSidebar } from "@/components/shell/AppSidebar";
import { TopBar } from "@/components/shell/TopBar";
import { MobileNav } from "@/components/shell/MobileNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh">
      <AppSidebar role={user.role} />
      <div className="flex min-h-dvh flex-col md:pl-16 xl:pl-[232px]">
        <TopBar userName={user.name} role={user.role} />
        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-6 w-full max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
      <MobileNav role={user.role} />
    </div>
  );
}
