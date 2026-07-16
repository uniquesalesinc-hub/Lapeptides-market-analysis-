"use client";

import { useState, useTransition } from "react";
import { clientLoginAction } from "@/lib/actions/client-auth-actions";

/**
 * Store client login form. On success the server action sets the client session cookie and
 * redirects (Next follows the redirect automatically); on failure it returns one generic
 * message for every reason, so the form never reveals whether an email exists.
 */
export function ClientLoginForm({ from }: { from?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await clientLoginAction({
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
        from,
      });
      // A successful login redirects inside the action and never returns here.
      if (result && !result.ok) setError(result.error ?? "Invalid email or password.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="label-text">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="input-field"
          placeholder="you@yourclinic.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="label-text">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input-field"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-lap-red/40 bg-lap-red/10 px-3 py-2 text-sm text-lap-red">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
