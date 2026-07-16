"use client";

import { useState, useTransition } from "react";
import { Logo } from "@/components/brand/Logo";
import { requestPasswordReset } from "@/lib/actions/auth-actions";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await requestPasswordReset(formData);
      setMessage(result.message);
      setDevResetUrl("devResetUrl" in result ? (result.devResetUrl as string) : null);
    });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-xl font-semibold text-white">Reset your password</h1>
        <p className="mb-6 text-sm text-brand-slate-400">
          Enter your account email and we&apos;ll send a reset link.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="label-text">
              Email
            </label>
            <input id="email" name="email" type="email" required className="input-field" />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={isPending}>
            {isPending ? "Sending…" : "Send reset link"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-brand-slate-300">{message}</p>}
        {devResetUrl && (
          <p className="mt-2 rounded-lg border border-brand-warning/40 bg-brand-warning/10 p-3 text-xs text-brand-warning">
            Email delivery is not configured in this environment. Development reset link:{" "}
            <a href={devResetUrl} className="underline">
              {devResetUrl}
            </a>
          </p>
        )}

        <div className="mt-6 text-center">
          <a href="/login" className="text-sm text-brand-teal">
            Back to sign in
          </a>
        </div>
      </div>
    </main>
  );
}
