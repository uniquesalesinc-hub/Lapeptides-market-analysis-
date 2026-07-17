import Link from "next/link";
import { requireClient } from "@/lib/clientSession";
import { getBrandKit } from "@/lib/data/brand";
import { ClientBrandKit } from "@/components/store/ClientBrandKit";

export const metadata = { title: "Brand kit | LA Peptides" };

/**
 * Client brand kit: the customer-facing view of the same folder the LA Peptides team works
 * from (Customer 360 Brand tab). Colors are read-only here - they are locked with the team
 * because print production uses them verbatim - while assets (logo, social, vial labels)
 * can be uploaded by the client. Files the team uploaded are read-only on this surface.
 */
export default async function StoreBrandKitPage() {
  const client = await requireClient();
  const brand = await getBrandKit(client.customerId);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-lap-teal">
            {client.customerName}
          </p>
          <h1 className="font-heading text-3xl font-semibold text-lap-ink">Brand kit</h1>
          <p className="mt-2 max-w-xl text-sm text-lap-slate">
            The files our team uses for your labels and packaging. Upload your logo and artwork
            here; to change your brand colors, contact your LA Peptides rep.
          </p>
        </div>
        <Link href="/store/account" className="text-sm font-semibold text-lap-teal hover:underline">
          Back to account
        </Link>
      </div>

      <div className="mt-8">
        <ClientBrandKit brand={brand} />
      </div>

      <p className="mt-8 text-[11px] uppercase tracking-wide text-lap-slate">
        For research purposes only - not for human consumption.
      </p>
    </div>
  );
}
