"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendInvoice, cancelInvoice, voidInvoice, refundInvoice } from "@/lib/actions/invoice-actions";

export function InvoiceDetailActions({
  invoiceId,
  status,
  isAdmin,
  hasPayments,
}: {
  invoiceId: string;
  status: string;
  isAdmin: boolean;
  hasPayments: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);

  function handleSend() {
    startTransition(async () => {
      const result = await sendInvoice(invoiceId);
      setMessage(result.message ?? null);
      router.refresh();
    });
  }
  function handleCancel() {
    startTransition(async () => {
      await cancelInvoice(invoiceId);
      router.refresh();
    });
  }
  function handleVoid() {
    startTransition(async () => {
      await voidInvoice(invoiceId);
      router.refresh();
    });
  }
  function handleRefund() {
    startTransition(async () => {
      await refundInvoice(invoiceId);
      router.refresh();
    });
  }

  return (
    <div className="no-print space-y-2">
      {message && <p className="text-sm text-brand-teal">{message}</p>}
      <div className="grid grid-cols-2 gap-2">
        <a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary">
          Download PDF
        </a>
        {status === "DRAFT" && (
          <button type="button" className="btn-primary" onClick={handleSend} disabled={pending}>
            Send to Customer
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {!hasPayments && ["DRAFT", "SENT"].includes(status) && (
          confirmCancel ? (
            <button type="button" className="btn-danger" onClick={handleCancel} disabled={pending}>
              Confirm cancel
            </button>
          ) : (
            <button type="button" className="btn-danger" onClick={() => setConfirmCancel(true)}>
              Cancel invoice
            </button>
          )
        )}
        {isAdmin && !["VOIDED", "CANCELLED"].includes(status) && (
          confirmVoid ? (
            <button type="button" className="btn-danger" onClick={handleVoid} disabled={pending}>
              Confirm void
            </button>
          ) : (
            <button type="button" className="btn-danger" onClick={() => setConfirmVoid(true)}>
              Void invoice
            </button>
          )
        )}
        {isAdmin && ["PAID", "PARTIALLY_PAID"].includes(status) && (
          <button type="button" className="btn-secondary" onClick={handleRefund} disabled={pending}>
            Mark refunded
          </button>
        )}
      </div>
    </div>
  );
}
