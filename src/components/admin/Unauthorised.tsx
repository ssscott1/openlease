"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

/**
 * Shown when someone is signed in but has no active staff profile.
 * Rendered in place (never a redirect) so a missing/deactivated profile
 * can't ping-pong between the layout and the auth proxy.
 */
export function Unauthorised({ email }: { email: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">
        No CRM access for this account
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-soft">
        You&apos;re signed in as <strong>{email}</strong>, but this account has no
        active staff profile. An administrator needs to add a row for it in
        the <code className="rounded bg-mist px-1">profiles</code> table with
        role <code className="rounded bg-mist px-1">admin</code> or{" "}
        <code className="rounded bg-mist px-1">sales</code>.
      </p>
      <button
        type="button"
        onClick={signOut}
        className="mt-8 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
      >
        Sign out and use a different account
      </button>
    </main>
  );
}
