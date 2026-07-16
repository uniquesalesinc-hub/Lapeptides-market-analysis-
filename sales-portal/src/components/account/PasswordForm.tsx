"use client";

import { useState, useTransition } from "react";
import { changeOwnPassword } from "@/lib/actions/user-actions";

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await changeOwnPassword({
        currentPassword: String(formData.get("currentPassword") || ""),
        newPassword: String(formData.get("newPassword") || ""),
      });
      setOk(result.ok);
      setMessage(result.ok ? "Password updated." : result.message ?? "Could not update password.");
      if (result.ok) (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-4">
      <h2 className="font-semibold text-white">Change Password</h2>
      <div>
        <label className="label-text">Current password</label>
        <input name="currentPassword" type="password" required className="input-field" />
      </div>
      <div>
        <label className="label-text">New password</label>
        <input name="newPassword" type="password" minLength={8} required className="input-field" />
      </div>
      {message && <p className={`text-sm ${ok ? "text-lap-green" : "text-lap-red"}`}>{message}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}
