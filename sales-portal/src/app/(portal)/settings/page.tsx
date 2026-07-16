import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await prisma.companySettings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Settings</h1>
      <SettingsForm
        settings={{
          ...settings,
          defaultTaxRatePercent: Number(settings.defaultTaxRatePercent),
          repDiscountLimitPercent: Number(settings.repDiscountLimitPercent),
        }}
      />
    </div>
  );
}
