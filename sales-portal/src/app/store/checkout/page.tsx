import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/clientSession";
import { getPricedClientCart } from "@/lib/data/clientCart";
import { computeDueDate } from "@/lib/invoiceTerms";
import { formatDate } from "@/lib/format";
import { CheckoutFlow } from "@/components/store/CheckoutFlow";

export const metadata = { title: "Checkout | LA Peptides" };

/**
 * Client checkout entry. Server-gated twice over: an empty, under-minimum, or unpriceable
 * cart bounces straight back to /store/cart (so checkout can never render a cart that could
 * not be ordered), and placeClientOrder re-enforces every gate again at submission.
 */
export default async function StoreCheckoutPage() {
  const session = await requireClient();
  const cart = await getPricedClientCart(session);

  if (cart.items.length === 0 || cart.minimumShortfall > 0 || !cart.allLinesQualify) {
    redirect("/store/cart");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: { shippingAddress: true, billingAddress: true, paymentTerms: true },
  });
  if (!customer) redirect("/store/cart");

  const paymentTerms = customer.paymentTerms || "Prepaid";
  const termsLine = /^Net\s+\d+$/i.test(paymentTerms)
    ? `due ${formatDate(computeDueDate(paymentTerms))}`
    : "due on receipt";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-semibold text-lap-ink">Checkout</h1>
      <div className="mt-6">
        <CheckoutFlow
          cart={cart}
          initialShippingAddress={customer.shippingAddress ?? ""}
          initialBillingAddress={customer.billingAddress ?? ""}
          paymentTerms={paymentTerms}
          termsLine={termsLine}
        />
      </div>
      <p className="mt-6 text-[11px] uppercase tracking-wide text-lap-slate">
        For research purposes only - not for human consumption.
      </p>
    </div>
  );
}
