import { describe, expect, it } from "vitest";
import {
  CLIENT_ORDER_MINIMUM_UNITS,
  CLIENT_RUO_ACKNOWLEDGMENT,
  buildClientOrderInternalNotes,
  clientOrderMinimumShortfall,
  clientOrderStatusLabel,
} from "./clientOrder";
import { placeClientOrderSchema } from "./validation/clientOrder";

describe("clientOrderMinimumShortfall", () => {
  it("mirrors the rep-surface 20-unit order minimum", () => {
    expect(CLIENT_ORDER_MINIMUM_UNITS).toBe(20);
  });

  it("reports the units missing under the minimum", () => {
    expect(clientOrderMinimumShortfall(0)).toBe(20);
    expect(clientOrderMinimumShortfall(5)).toBe(15);
    expect(clientOrderMinimumShortfall(19)).toBe(1);
  });

  it("is zero at and above the minimum", () => {
    expect(clientOrderMinimumShortfall(20)).toBe(0);
    expect(clientOrderMinimumShortfall(22)).toBe(0);
    expect(clientOrderMinimumShortfall(500)).toBe(0);
  });
});

describe("placeClientOrderSchema RUO gate", () => {
  const base = { shippingAddress: "123 Lab Way, Phoenix AZ 85001" };

  it("rejects when the acknowledgment is missing or false", () => {
    expect(placeClientOrderSchema.safeParse({ ...base }).success).toBe(false);
    expect(placeClientOrderSchema.safeParse({ ...base, ruoAcknowledged: false }).success).toBe(false);
    // A truthy-but-not-true value must not slip through either.
    expect(placeClientOrderSchema.safeParse({ ...base, ruoAcknowledged: "yes" }).success).toBe(false);
  });

  it("accepts only a literal true acknowledgment", () => {
    const parsed = placeClientOrderSchema.safeParse({ ...base, ruoAcknowledged: true });
    expect(parsed.success).toBe(true);
  });

  it("requires a shipping address", () => {
    expect(placeClientOrderSchema.safeParse({ shippingAddress: "  ", ruoAcknowledged: true }).success).toBe(false);
  });

  it("keeps the acknowledgment copy exact", () => {
    expect(CLIENT_RUO_ACKNOWLEDGMENT).toBe(
      "I acknowledge these products are for research purposes only and not for human consumption."
    );
  });
});

describe("clientOrderStatusLabel", () => {
  it("presents SENT/VIEWED client orders as received and pending review", () => {
    expect(clientOrderStatusLabel("SENT")).toBe("Received - pending review");
    expect(clientOrderStatusLabel("VIEWED")).toBe("Received - pending review");
  });

  it("maps the rest of the pipeline to client vocabulary", () => {
    expect(clientOrderStatusLabel("APPROVED")).toBe("Confirmed");
    expect(clientOrderStatusLabel("CONVERTED_TO_INVOICE")).toBe("Invoiced");
    expect(clientOrderStatusLabel("DECLINED")).toBe("Declined");
    expect(clientOrderStatusLabel("CANCELLED")).toBe("Cancelled");
  });
});

describe("buildClientOrderInternalNotes", () => {
  const buyer = { name: "Jamie Buyer", email: "jamie@clinic.example" };

  it("always carries the client portal order prefix and the buyer identity", () => {
    const notes = buildClientOrderInternalNotes(buyer, []);
    expect(notes).toBe("Client portal order placed by Jamie Buyer (jamie@clinic.example).");
  });

  it("appends SKU-tagged line notes and skips empty ones", () => {
    const notes = buildClientOrderInternalNotes(buyer, [
      { sku: "BPC157-10MG", note: "Blue caps please" },
      { sku: "IPAMORELIN-10MG", note: null },
      { sku: "TESA-10MG", note: "   " },
    ]);
    expect(notes).toBe(
      "Client portal order placed by Jamie Buyer (jamie@clinic.example).\nBPC157-10MG: Blue caps please"
    );
  });
});
