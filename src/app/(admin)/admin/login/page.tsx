import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center">
          <Logo ringClassName="h-7 w-7" textClassName="text-2xl" />
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
