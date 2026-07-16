"use client";

import { useState, useTransition } from "react";
import { updateCompanySettings } from "@/lib/actions/settings-actions";
import type { CompanySettings } from "@prisma/client";

// Prisma's Decimal fields aren't plain serializable objects, so the settings passed from the
// server component are pre-converted to numbers (see /settings/page.tsx) before crossing the
// client-component boundary.
type SerializableCompanySettings = Omit<CompanySettings, "defaultTaxRatePercent" | "repDiscountLimitPercent"> & {
  defaultTaxRatePercent: number;
  repDiscountLimitPercent: number;
};

export function SettingsForm({ settings }: { settings: SerializableCompanySettings }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [allowNetTerms, setAllowNetTerms] = useState(settings.allowNetTerms);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) || "");

    startTransition(async () => {
      const result = await updateCompanySettings({
        companyName: get("companyName"),
        dbaName: get("dbaName"),
        addressLine1: get("addressLine1"),
        addressLine2: get("addressLine2"),
        city: get("city"),
        state: get("state"),
        postalCode: get("postalCode"),
        phone: get("phone"),
        email: get("email"),
        website: get("website"),
        quotePrefix: get("quotePrefix"),
        invoicePrefix: get("invoicePrefix"),
        defaultQuoteExpirationDays: Number(get("defaultQuoteExpirationDays") || 30),
        defaultPaymentTerms: get("defaultPaymentTerms"),
        allowNetTerms,
        achInstructions: get("achInstructions"),
        defaultQuoteNotes: get("defaultQuoteNotes"),
        defaultTermsAndConditions: get("defaultTermsAndConditions"),
        pdfFooterText: get("pdfFooterText"),
        customerApprovalLanguage: get("customerApprovalLanguage"),
        taxBehavior: get("taxBehavior") as "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT_BY_DEFAULT",
        defaultTaxRatePercent: Number(get("defaultTaxRatePercent") || 0),
        repDiscountLimitPercent: Number(get("repDiscountLimitPercent") || 5),
      });
      setMessage(result.ok ? "Settings saved." : result.message ?? "Could not save settings.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <section className="card space-y-3 p-4">
        <h2 className="font-heading text-base font-semibold text-lap-ink">Company Information</h2>
        <Field label="Company name" name="companyName" defaultValue={settings.companyName} required />
        <Field label="DBA name" name="dbaName" defaultValue={settings.dbaName ?? ""} />
        <Field label="Address line 1" name="addressLine1" defaultValue={settings.addressLine1 ?? ""} />
        <Field label="Address line 2" name="addressLine2" defaultValue={settings.addressLine2 ?? ""} />
        <div className="grid grid-cols-3 gap-2">
          <Field label="City" name="city" defaultValue={settings.city ?? ""} />
          <Field label="State" name="state" defaultValue={settings.state ?? ""} />
          <Field label="ZIP" name="postalCode" defaultValue={settings.postalCode ?? ""} />
        </div>
        <Field label="Phone" name="phone" type="tel" defaultValue={settings.phone ?? ""} />
        <Field label="Email" name="email" type="email" defaultValue={settings.email ?? ""} />
        <Field label="Website" name="website" defaultValue={settings.website ?? ""} />
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-heading text-base font-semibold text-lap-ink">Numbering & Terms</h2>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Quote prefix" name="quotePrefix" defaultValue={settings.quotePrefix} />
          <Field label="Invoice prefix" name="invoicePrefix" defaultValue={settings.invoicePrefix} />
        </div>
        <Field
          label="Default quote expiration (days)"
          name="defaultQuoteExpirationDays"
          type="number"
          defaultValue={String(settings.defaultQuoteExpirationDays)}
        />
        <div>
          <label className="label-text">Default payment terms</label>
          <select name="defaultPaymentTerms" defaultValue={settings.defaultPaymentTerms} className="input-field">
            <option value="Prepaid">Prepaid</option>
            <option value="Net 15">Net 15</option>
            <option value="Net 30">Net 30</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-lap-slate">
          <input type="checkbox" checked={allowNetTerms} onChange={(e) => setAllowNetTerms(e.target.checked)} />
          Allow representatives to offer Net terms (business is prepaid by default)
        </label>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-heading text-base font-semibold text-lap-ink">Tax & Discounts</h2>
        <div>
          <label className="label-text">Tax behavior</label>
          <select name="taxBehavior" defaultValue={settings.taxBehavior} className="input-field">
            <option value="EXCLUSIVE">Exclusive (added on top)</option>
            <option value="INCLUSIVE">Inclusive (included in price)</option>
            <option value="EXEMPT_BY_DEFAULT">Exempt by default</option>
          </select>
        </div>
        <Field
          label="Default tax rate (%)"
          name="defaultTaxRatePercent"
          type="number"
          defaultValue={String(settings.defaultTaxRatePercent)}
        />
        <Field
          label="Default representative discount limit (%)"
          name="repDiscountLimitPercent"
          type="number"
          defaultValue={String(settings.repDiscountLimitPercent)}
        />
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-heading text-base font-semibold text-lap-ink">Documents & Payment</h2>
        <div>
          <label className="label-text">ACH instructions</label>
          <textarea name="achInstructions" rows={3} defaultValue={settings.achInstructions ?? ""} className="input-field !h-auto py-2" />
        </div>
        <div>
          <label className="label-text">Default quote notes</label>
          <textarea name="defaultQuoteNotes" rows={2} defaultValue={settings.defaultQuoteNotes ?? ""} className="input-field !h-auto py-2" />
        </div>
        <div>
          <label className="label-text">Default terms & conditions</label>
          <textarea
            name="defaultTermsAndConditions"
            rows={4}
            defaultValue={settings.defaultTermsAndConditions ?? ""}
            className="input-field !h-auto py-2"
          />
        </div>
        <div>
          <label className="label-text">PDF footer text</label>
          <textarea name="pdfFooterText" rows={2} defaultValue={settings.pdfFooterText ?? ""} className="input-field !h-auto py-2" />
        </div>
        <div>
          <label className="label-text">Customer approval language</label>
          <textarea
            name="customerApprovalLanguage"
            rows={2}
            defaultValue={settings.customerApprovalLanguage ?? ""}
            className="input-field !h-auto py-2"
          />
        </div>
      </section>

      {message && <p className="text-sm text-lap-teal">{message}</p>}
      <button type="submit" className="btn-primary sticky bottom-24 w-full" disabled={pending}>
        {pending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label-text" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type={type} defaultValue={defaultValue} required={required} className="input-field" />
    </div>
  );
}
