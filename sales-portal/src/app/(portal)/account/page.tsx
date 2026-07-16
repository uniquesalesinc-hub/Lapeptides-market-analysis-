import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PasswordForm } from "@/components/account/PasswordForm";

export default async function AccountPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser.id } });

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-xl font-semibold text-lap-ink">Account</h1>

      <div className="card p-4 text-sm">
        <p className="label-text !mb-0">Role</p>
        <p className="text-lap-ink">{user.role === "ADMIN" ? "Administrator" : "Sales Representative"}</p>
        {user.role === "SALES_REP" && (
          <>
            <p className="label-text !mb-0 mt-2">Discount limit</p>
            <p className="text-lap-ink">{Number(user.discountLimitPercent)}% without administrator approval</p>
          </>
        )}
        <p className="label-text !mb-0 mt-2">Email</p>
        <p className="text-lap-ink">{user.email}</p>
      </div>

      <ProfileForm name={user.name} phone={user.phone ?? ""} />
      <PasswordForm />
    </div>
  );
}
