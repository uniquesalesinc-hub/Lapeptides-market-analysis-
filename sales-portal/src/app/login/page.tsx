import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 font-heading text-xl font-semibold text-lap-ink">Sales Portal sign in</h1>
        <p className="mb-6 text-sm text-lap-slate">
          Authorized LA Peptides sales representatives and administrators only.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-8 max-w-sm text-center text-xs text-lap-slate">
        Access is administrator-controlled. New accounts must be activated before sign in is
        permitted.
      </p>
    </main>
  );
}
