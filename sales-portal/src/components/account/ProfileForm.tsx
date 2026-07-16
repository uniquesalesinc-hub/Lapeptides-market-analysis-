"use client";

import { useState, useTransition } from "react";
import { updateOwnProfile } from "@/lib/actions/user-actions";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateOwnProfile({
        name: String(formData.get("name") || ""),
        phone: String(formData.get("phone") || ""),
      });
      setMessage(result.ok ? "Saved." : result.message ?? "Could not save.");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3 p-4">
      <h2 className="font-semibold text-white">Profile</h2>
      <div>
        <label className="label-text">Name</label>
        <input name="name" defaultValue={name} required className="input-field" />
      </div>
      <div>
        <label className="label-text">Phone</label>
        <input name="phone" type="tel" inputMode="tel" defaultValue={phone} className="input-field" />
      </div>
      {message && <p className="text-sm text-brand-teal">{message}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
