"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Customer } from "@prisma/client";
import type { CustomerActionResult } from "@/lib/actions/customer-actions";

interface RepOption {
  id: string;
  name: string;
}

export function CustomerForm({
  action,
  customer,
  reps,
  isAdmin,
  isProspect = false,
  onCreated,
}: {
  action: (prev: CustomerActionResult, formData: FormData) => Promise<CustomerActionResult>;
  customer?: Customer | null;
  reps: RepOption[];
  isAdmin: boolean;
  isProspect?: boolean;
  onCreated?: (customerId: string) => void;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(action, { ok: false } as CustomerActionResult);
  const [shippingSame, setShippingSame] = useState(customer?.shippingSameAsBilling ?? true);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  useEffect(() => {
    if (state.ok && state.customerId) {
      if (onCreated) onCreated(state.customerId);
      else router.push(`/customers/${state.customerId}`);
    }
    if (state.duplicates?.length) setConfirmDuplicate(false);
  }, [state, router, onCreated]);

  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="space-y-5">
      {isProspect && <input type="hidden" name="isProspect" value="true" />}
      {confirmDuplicate && <input type="hidden" name="confirmDuplicate" value="true" />}

      {state.duplicates && state.duplicates.length > 0 && (
        <div className="card border-brand-warning/40 bg-brand-warning/10 p-4">
          <p className="font-semibold text-brand-warning">Possible duplicate customer</p>
          <ul className="mt-2 space-y-1 text-sm text-brand-slate-200">
            {state.duplicates.map((d) => (
              <li key={d.id}>
                <a href={`/customers/${d.id}`} className="underline">
                  {d.businessName}
                </a>{" "}
                — {d.contactName} {d.email ? `(${d.email})` : ""}
              </li>
            ))}
          </ul>
          <button
            type="submit"
            onClick={() => setConfirmDuplicate(true)}
            className="btn-secondary mt-3"
          >
            Create anyway
          </button>
        </div>
      )}

      {state.message && !state.ok && !state.duplicates && (
        <p className="rounded-lg border border-brand-danger/40 bg-brand-danger/10 px-3 py-2 text-sm text-brand-danger">
          {state.message}
        </p>
      )}

      <section className="card space-y-4 p-4">
        <h2 className="font-semibold text-white">Business Information</h2>
        <Field label="Business name" name="businessName" defaultValue={customer?.businessName} error={err("businessName")} required />
        <Field label="Contact name" name="contactName" defaultValue={customer?.contactName} error={err("contactName")} required />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" name="email" type="email" inputMode="email" defaultValue={customer?.email ?? ""} error={err("email")} />
          <Field label="Phone" name="phone" type="tel" inputMode="tel" defaultValue={customer?.phone ?? ""} error={err("phone")} />
        </div>
        <Field label="Website" name="website" type="url" defaultValue={customer?.website ?? ""} error={err("website")} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-text">Customer type</label>
            <select name="customerType" defaultValue={customer?.customerType ?? "RESELLER"} className="input-field">
              <option value="RESELLER">Reseller</option>
              <option value="DISTRIBUTOR">Distributor</option>
              <option value="CLINIC">Clinic</option>
              <option value="INDIVIDUAL_PRACTITIONER">Individual Practitioner</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="label-text">Wholesale price list</label>
            <select
              name="defaultPriceListCode"
              defaultValue={customer?.defaultPriceListCode ?? "BULK_RETAIL"}
              className="input-field"
            >
              <option value="BULK_RETAIL">Bulk Retail</option>
              <option value="BULK_WHOLESALE">Bulk Wholesale</option>
              <option value="WHOLESALE_SPRAYS">Wholesale Sprays</option>
              <option value="WHOLESALE_CREAMS">Wholesale Creams</option>
            </select>
          </div>
        </div>
        {isAdmin && (
          <div>
            <label className="label-text">Assigned sales representative</label>
            <select name="assignedRepId" defaultValue={customer?.assignedRepId} className="input-field" required>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="font-semibold text-white">Billing Address</h2>
        <Field label="Address line 1" name="billingAddressLine1" defaultValue={customer?.billingAddressLine1 ?? ""} />
        <Field label="Address line 2" name="billingAddressLine2" defaultValue={customer?.billingAddressLine2 ?? ""} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="City" name="billingCity" defaultValue={customer?.billingCity ?? ""} />
          <Field label="State" name="billingState" defaultValue={customer?.billingState ?? ""} />
          <Field label="ZIP" name="billingPostalCode" inputMode="numeric" defaultValue={customer?.billingPostalCode ?? ""} />
        </div>
      </section>

      <section className="card space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Shipping Address</h2>
          <label className="flex items-center gap-2 text-sm text-brand-slate-300">
            <input
              type="checkbox"
              name="shippingSameAsBilling"
              defaultChecked={shippingSame}
              onChange={(e) => setShippingSame(e.target.checked)}
            />
            Same as billing
          </label>
        </div>
        {!shippingSame && (
          <>
            <Field label="Address line 1" name="shippingAddressLine1" defaultValue={customer?.shippingAddressLine1 ?? ""} />
            <Field label="Address line 2" name="shippingAddressLine2" defaultValue={customer?.shippingAddressLine2 ?? ""} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="City" name="shippingCity" defaultValue={customer?.shippingCity ?? ""} />
              <Field label="State" name="shippingState" defaultValue={customer?.shippingState ?? ""} />
              <Field label="ZIP" name="shippingPostalCode" inputMode="numeric" defaultValue={customer?.shippingPostalCode ?? ""} />
            </div>
          </>
        )}
      </section>

      <section className="card space-y-4 p-4">
        <h2 className="font-semibold text-white">Billing & Notes</h2>
        <div>
          <label className="label-text">Payment terms</label>
          <select name="paymentTerms" defaultValue={customer?.paymentTerms ?? "Prepaid"} className="input-field">
            <option value="Prepaid">Prepaid</option>
            <option value="Net 15">Net 15 (requires admin enablement)</option>
            <option value="Net 30">Net 30 (requires admin enablement)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-slate-300">
          <input type="checkbox" name="taxExempt" defaultChecked={customer?.taxExempt} />
          Tax-exempt
        </label>
        <Field
          label="Tax ID / exemption notes"
          name="taxIdOrExemptionNotes"
          defaultValue={customer?.taxIdOrExemptionNotes ?? ""}
        />
        <Field label="Follow-up date" name="followUpDate" type="date" defaultValue={customer?.followUpDate?.toISOString().slice(0, 10) ?? ""} />
        <div>
          <label className="label-text">Internal notes (never shown to customer)</label>
          <textarea name="internalNotes" rows={2} defaultValue={customer?.internalNotes ?? ""} className="input-field !h-auto py-2" />
        </div>
        <div>
          <label className="label-text">Customer-facing notes</label>
          <textarea
            name="customerFacingNotes"
            rows={2}
            defaultValue={customer?.customerFacingNotes ?? ""}
            className="input-field !h-auto py-2"
          />
        </div>
      </section>

      <SubmitButton isEdit={!!customer} />
    </form>
  );
}

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary sticky bottom-24 w-full" disabled={pending}>
      {pending ? "Saving…" : isEdit ? "Save changes" : "Create customer"}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  error,
  required,
  inputMode,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  error?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <label className="label-text" htmlFor={name}>
        {label}
        {required && <span className="text-brand-danger"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="input-field"
      />
      {error && <p className="mt-1 text-xs text-brand-danger">{error}</p>}
    </div>
  );
}
