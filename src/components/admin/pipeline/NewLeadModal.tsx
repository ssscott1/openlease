"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types";
import { locales } from "@/i18n/routing";

export function NewLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("leads")
      .insert({
        name: String(fd.get("name") ?? "").trim(),
        email: String(fd.get("email") ?? "").trim(),
        phone: String(fd.get("phone") ?? "").trim(),
        employer: String(fd.get("employer") ?? "").trim(),
        visa_type: String(fd.get("visa_type") ?? "").trim(),
        visa_expiry: (fd.get("visa_expiry") as string) || null,
        preferred_language: String(fd.get("preferred_language") ?? "en"),
        source: String(fd.get("source") ?? "manual"),
        status: "new",
      })
      .select()
      .single();

    if (insertError || !data) {
      setBusy(false);
      setError(insertError?.message ?? "Insert failed");
      return;
    }
    onCreated(data as Lead);
  }

  const input =
    "mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="New lead"
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold">New lead</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Name *
            <input ref={nameRef} name="name" required className={input} />
          </label>
          <label className="text-sm font-medium">
            Email *
            <input name="email" type="email" required className={input} />
          </label>
          <label className="text-sm font-medium">
            Phone
            <input name="phone" type="tel" className={input} />
          </label>
          <label className="text-sm font-medium">
            Employer
            <input name="employer" className={input} />
          </label>
          <label className="text-sm font-medium">
            Visa type
            <input name="visa_type" placeholder="e.g. 482" className={input} />
          </label>
          <label className="text-sm font-medium">
            Visa expiry
            <input name="visa_expiry" type="date" className={input} />
          </label>
          <label className="text-sm font-medium">
            Language
            <select name="preferred_language" defaultValue="en" className={input}>
              {locales.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Source
            <select name="source" defaultValue="manual" className={input}>
              <option value="manual">manual</option>
              <option value="website">website</option>
              <option value="partner">partner</option>
              <option value="referral">referral</option>
              <option value="phone">phone</option>
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
