"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

/** Only ever follow a same-origin, relative path from `?next=` - never an absolute or
 *  protocol-relative URL, which would let a crafted login link redirect a freshly-authenticated
 *  user off-site (e.g. `/login?next=https://evil.example` or `//evil.example`). */
function sanitizeNextPath(value: string | null): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = sanitizeNextPath(params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    startTransition(async () => {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) {
        // `result.error` is always the generic Auth.js error type ("CredentialsSignin") for
        // every authorize() failure; the specific reason travels in `result.code`, set by the
        // AccountPendingActivationError/AccountDeactivatedError subclasses in src/auth.ts.
        if (result?.code === "ACCOUNT_PENDING_ACTIVATION") {
          setError("Your account has been created but is not yet activated. Contact your administrator.");
        } else if (result?.code === "ACCOUNT_DEACTIVATED") {
          setError("This account has been deactivated. Contact your administrator.");
        } else {
          setError("Invalid email or password.");
        }
        return;
      }
      router.push(next);
      router.refresh();
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
          placeholder="you@lapeptides.net"
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

      <div className="text-center">
        <a href="/forgot-password" className="text-sm text-lap-teal hover:underline">
          Forgot your password?
        </a>
      </div>
    </form>
  );
}
