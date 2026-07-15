"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { confirmPasswordReset } from "@/lib/actions/auth-actions";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("token", token);
    startTransition(async () => {
      const result = await confirmPasswordReset(formData);
      setMessage(result.message);
      setSuccess(result.ok);
    });
  }

  if (!token) {
    return <p className="text-sm text-brand-danger">Missing or invalid reset link.</p>;
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="label-text">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            className="input-field"
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={isPending || success}>
          {isPending ? "Updating…" : "Update password"}
        </button>
      </form>
      {message && (
        <p className={`mt-4 text-sm ${success ? "text-brand-success" : "text-brand-danger"}`}>{message}</p>
      )}
      {success && (
        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-brand-teal">
            Continue to sign in
          </a>
        </div>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-xl font-semibold text-white">Set a new password</h1>
        <p className="mb-6 text-sm text-brand-slate-400">Choose a new password for your account.</p>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
