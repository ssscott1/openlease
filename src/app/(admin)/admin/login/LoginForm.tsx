"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    });

    if (authError) {
      setBusy(false);
      setError(
        authError.message === "Invalid login credentials"
          ? "Invalid email or password."
          : authError.message,
      );
      return;
    }

    const next = searchParams.get("next");
    router.replace(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-line bg-white p-6"
    >
      <h1 className="text-lg font-semibold">Admin Login</h1>
      <div className="mt-5 space-y-4">
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            autoFocus
            className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-base font-normal focus:outline-2 focus:outline-accent"
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-base font-normal focus:outline-2 focus:outline-accent"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-full bg-accent px-6 py-3 text-base font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
