import { z } from "zod";

/**
 * Checkout payload for placeClientOrder. Deliberately tiny: the client submits addresses
 * and the acknowledgment ONLY - never line items, quantities, or prices. The order's lines
 * come from the server-side ClientCart and are re-priced server-side, so a tampered payload
 * has nothing money-shaped to tamper with.
 */
export const placeClientOrderSchema = z.object({
  shippingAddress: z.string().trim().min(1, "Enter a shipping address.").max(2000),
  billingAddress: z.string().trim().max(2000).optional(),
  /**
   * Must be literally true. The server refuses the order otherwise - the checkbox is not a
   * UI nicety, it is the recorded compliance event (Quote.ruoAcknowledgedAt).
   */
  ruoAcknowledged: z.literal(true, {
    errorMap: () => ({ message: "You must acknowledge the research use only terms to place this order." }),
  }),
});

export type PlaceClientOrderInput = z.infer<typeof placeClientOrderSchema>;
