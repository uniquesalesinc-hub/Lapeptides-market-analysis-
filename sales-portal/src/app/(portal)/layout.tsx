import { requireUser } from "@/lib/session";
import { Logo } from "@/components/brand/Logo";
import { BottomNav } from "@/components/nav/BottomNav";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-brand-border bg-brand-navy/95 px-4 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)", minHeight: "56px" }}
      >
        <Logo />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-brand-slate-300 sm:inline">
            {user.name} · <span className="text-brand-teal">{user.role === "ADMIN" ? "Admin" : "Sales Rep"}</span>
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4">{children}</main>

      <BottomNav role={user.role} />
    </div>
  );
}
