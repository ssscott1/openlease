import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 text-xl font-semibold tracking-tight">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-base font-bold text-white"
          >
            O
          </span>
          OpenLease CRM
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-ink-soft">
          Staff access only. Customers:{" "}
          <Link href="/" className="underline hover:text-ink">
            return to the website
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
