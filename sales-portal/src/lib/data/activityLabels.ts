import type { ActivityAction } from "@prisma/client";

export const ACTIVITY_LABELS: Record<ActivityAction, string> = {
  QUOTE_CREATED: "Quote created",
  QUOTE_EDITED: "Quote edited",
  PRICING_APPLIED: "Pricing applied",
  DISCOUNT_ADDED: "Discount added",
  QUOTE_SENT: "Quote sent",
  QUOTE_VIEWED: "Quote viewed by customer",
  QUOTE_APPROVED: "Quote approved",
  QUOTE_DECLINED: "Quote declined",
  QUOTE_CONVERTED: "Quote converted to invoice",
  QUOTE_CANCELLED: "Quote cancelled",
  INVOICE_CREATED: "Invoice created",
  INVOICE_SENT: "Invoice sent",
  PAYMENT_RECORDED: "Payment recorded",
  INVOICE_MARKED_PAID: "Invoice marked paid",
  DOCUMENT_DOWNLOADED: "Document downloaded",
  USER_LOGIN: "Signed in",
  USER_LOGOUT: "Signed out",
  ADMIN_PRICING_UPDATE: "Pricing updated",
  CUSTOMER_CREATED: "Customer created",
  CUSTOMER_EDITED: "Customer edited",
};
