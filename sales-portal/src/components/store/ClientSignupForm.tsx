"use client";

import { useState, useTransition } from "react";
import { clientSignupAction } from "@/lib/actions/client-auth-actions";

/**
 * Account request form. Files a WEBSITE-source Lead for admin review; no account or
 * credentials are created here. On success the form swaps to a confirmation state.
 */
export function ClientSignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (submitted) {
    return (
      <div className="rounded-[10px] border border-lap-green/40 bg-lap-green/10 p-6 text-center">
        <h2 className="mb-2 font-heading text-lg font-semibold text-lap-ink">
          Application received
        </h2>
        <p className="text-sm text-lap-slate">
          Our team reviews every request and will reach out.
        </p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await clientSignupAction({
        company: String(formData.get("company") || ""),
        firstName: String(formData.get("firstName") || ""),
        lastName: String(formData.get("lastName") || ""),
        email: String(formData.get("email") || ""),
        phone: String(formData.get("phone") || ""),
        message: String(formData.get("message") || ""),
      });
      if (result.ok) {
        setSubmitted(true);
      } else {
        setError(result.error ?? "Could not submit your request. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="company" className="label-text">
          Company or practice
        </label>
        <input id="company" name="company" required className="input-field" placeholder="Your clinic, med spa, or lab" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="label-text">
            First name
          </label>
          <input id="firstName" name="firstName" autoComplete="given-name" required className="input-field" />
        </div>
        <div>
          <label htmlFor="lastName" className="label-text">
            Last name
          </label>
          <input id="lastName" name="lastName" autoComplete="family-name" required className="input-field" />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="label-text">
          Work email
        </label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required className="input-field" />
      </div>
      <div>
        <label htmlFor="phone" className="label-text">
          Phone <span className="font-normal text-lap-slate/70">(optional)</span>
        </label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className="input-field" />
      </div>
      <div>
        <label htmlFor="message" className="label-text">
          Anything we should know? <span className="font-normal text-lap-slate/70">(optional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          maxLength={2000}
          className="input-field py-2"
          placeholder="Products you are interested in, expected volume, licensing details…"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-lap-red/40 bg-lap-red/10 px-3 py-2 text-sm text-lap-red">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? "Submitting…" : "Request an account"}
      </button>
    </form>
  );
}
