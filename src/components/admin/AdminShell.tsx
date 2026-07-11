"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { StaffRole } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { GlobalSearch } from "./GlobalSearch";

const NAV = [
  { href: "/admin", label: "Dashboard", adminOnly: false, icon: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" },
  { href: "/admin/pipeline", label: "Pipeline", adminOnly: false, icon: "M9 4.5v15m6-15v15M5.25 4.5h13.5M5.25 19.5h13.5" },
  { href: "/admin/radar", label: "End-of-term", adminOnly: false, icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { href: "/admin/vehicles", label: "Vehicles", adminOnly: true, icon: "M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" },
  { href: "/admin/pricing", label: "Pricing", adminOnly: true, icon: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { href: "/admin/audit", label: "Audit", adminOnly: true, icon: "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" },
  { href: "/admin/settings", label: "Settings", adminOnly: true, icon: "M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" },
] as const;

export function AdminShell({
  role,
  name,
  children,
}: {
  role: StaffRole;
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  // Global keyboard shortcuts: "/" opens search, "n" jumps to new lead,
  // "g" then a letter navigates (g p = pipeline, g d = dashboard, …).
  useEffect(() => {
    let goMode = false;
    let goTimer: ReturnType<typeof setTimeout>;

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (goMode) {
        goMode = false;
        clearTimeout(goTimer);
        const map: Record<string, string> = {
          d: "/admin",
          p: "/admin/pipeline",
          r: "/admin/radar",
          v: "/admin/vehicles",
          s: "/admin/settings",
        };
        if (map[e.key]) {
          e.preventDefault();
          router.push(map[e.key]);
        }
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "n") {
        e.preventDefault();
        router.push("/admin/pipeline?new=1");
      } else if (e.key === "g") {
        goMode = true;
        goTimer = setTimeout(() => (goMode = false), 800);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = NAV.filter((item) => !item.adminOnly || role === "admin");

  const navList = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Admin">
      {nav.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileNav(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-accent-soft text-accent-strong"
                : "text-ink-soft hover:bg-mist hover:text-ink"
            }`}
          >
            <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-e border-line bg-white p-4 lg:flex">
        <Link href="/admin" className="mb-6 block px-2">
          <Logo />
        </Link>
        {navList}
        <div className="border-t border-line pt-4">
          <p className="truncate px-2 text-sm font-medium">{name}</p>
          <p className="px-2 text-xs capitalize text-ink-soft">{role}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-ink-soft hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMobileNav((v) => !v)}
            aria-label="Toggle navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line lg:hidden"
          >
            <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-line px-3 text-sm text-ink-soft transition hover:border-ink-soft sm:max-w-md"
          >
            <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            Search leads, quotes, vehicles…
            <kbd className="ms-auto rounded border border-line bg-mist px-1.5 text-xs">/</kbd>
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-sm font-medium text-ink-soft hover:text-ink sm:block"
          >
            View site ↗
          </a>
        </header>

        {/* Mobile nav drawer */}
        {mobileNav && (
          <div className="border-b border-line bg-white p-4 lg:hidden">
            {navList}
            <button
              type="button"
              onClick={signOut}
              className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink-soft"
            >
              Sign out ({name})
            </button>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
