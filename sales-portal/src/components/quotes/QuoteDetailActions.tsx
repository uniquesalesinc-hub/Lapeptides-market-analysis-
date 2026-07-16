"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicateQuote, cancelQuote, deleteDraftQuote, finalizeAndSendQuote } from "@/lib/actions/quote-actions";
import { convertQuoteToInvoice } from "@/lib/actions/invoice-actions";

export function QuoteDetailActions({
  quoteId,
  status,
  publicToken,
  isConverted,
}: {
  quoteId: string;
  status: string;
  publicToken: string;
  isConverted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/q/${publicToken}` : `/q/${publicToken}`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "LA Peptides Quote", url: shareUrl });
        return;
      } catch {
        // user cancelled — fall through to copy
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setMessage("Link copied to clipboard.");
    setTimeout(() => setMessage(null), 2500);
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateQuote(quoteId);
      if (result.ok && result.quoteId) router.push(`/quotes/${result.quoteId}/edit`);
    });
  }

  function handleSend() {
    startTransition(async () => {
      const result = await finalizeAndSendQuote(quoteId);
      setMessage(result.message ?? (result.ok ? "Quote sent." : "Could not send quote."));
      if (result.ok) router.refresh();
    });
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelQuote(quoteId);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDraftQuote(quoteId);
      if (result.ok) router.push("/quotes");
    });
  }

  function handleConvert() {
    startTransition(async () => {
      const result = await convertQuoteToInvoice(quoteId);
      if (result.ok && result.invoiceId) router.push(`/invoices/${result.invoiceId}`);
      else setMessage(result.message ?? "Could not convert this quote.");
    });
  }

  return (
    <div className="no-print space-y-2">
      {message && <p className="text-sm text-lap-teal">{message}</p>}

      <div className="grid grid-cols-2 gap-2">
        <a href={`/api/quotes/${quoteId}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary">
          Download PDF
        </a>
        <button type="button" className="btn-secondary" onClick={handleShare}>
          Share Link
        </button>
      </div>

      {status === "DRAFT" && (
        <div className="grid grid-cols-2 gap-2">
          <a href={`/quotes/${quoteId}/edit`} className="btn-secondary">
            Edit
          </a>
          <button type="button" className="btn-primary" onClick={handleSend} disabled={pending}>
            Send to Customer
          </button>
        </div>
      )}

      {status === "APPROVED" && !isConverted && (
        <button type="button" className="btn-primary w-full" onClick={handleConvert} disabled={pending}>
          Convert to Invoice
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary" onClick={handleDuplicate} disabled={pending}>
          Duplicate
        </button>
        {status === "DRAFT" ? (
          confirmDelete ? (
            <button type="button" className="btn-danger" onClick={handleDelete} disabled={pending}>
              Confirm delete
            </button>
          ) : (
            <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
              Delete draft
            </button>
          )
        ) : !isConverted && status !== "CANCELLED" ? (
          confirmCancel ? (
            <button type="button" className="btn-danger" onClick={handleCancel} disabled={pending}>
              Confirm cancel
            </button>
          ) : (
            <button type="button" className="btn-danger" onClick={() => setConfirmCancel(true)}>
              Cancel quote
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
