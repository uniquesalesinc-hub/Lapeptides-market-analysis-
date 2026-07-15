import { requireAdmin } from "@/lib/session";
import { PricingUploadForm } from "@/components/pricing/PricingUploadForm";

export default async function PricingUploadPage() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-white">Upload Pricing</h1>
      <p className="text-sm text-brand-slate-400">
        Publishing a new price list creates a new version — the previous version is preserved,
        and every existing quote and invoice keeps the exact pricing that was active when it was
        created.
      </p>
      <PricingUploadForm />
    </div>
  );
}
