"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Result {
  kind: "lead" | "vehicle" | "quote";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      const supabase = createClient();
      const term = `%${query.trim()}%`;

      const [leads, vehicles] = await Promise.all([
        supabase
          .from("leads")
          .select("id, name, email, phone, status")
          .or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term},employer.ilike.${term}`)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("vehicles")
          .select("id, name, descriptor, base_weekly_rate")
          .ilike("name", term)
          .limit(4),
      ]);

      const found: Result[] = [
        ...(leads.data ?? []).map((l) => ({
          kind: "lead" as const,
          id: l.id,
          title: l.name,
          subtitle: `${l.email} · ${l.status}`,
          href: `/admin/leads/${l.id}`,
        })),
        ...(vehicles.data ?? []).map((v) => ({
          kind: "vehicle" as const,
          id: v.id,
          title: v.name,
          subtitle: `${v.descriptor} · $${v.base_weekly_rate}/wk base`,
          href: `/admin/vehicles`,
        })),
      ];
      setResults(found);
      setActive(0);
      setLoading(false);
    }, 180);
    return () => clearTimeout(handle);
  }, [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      router.push(results[active].href);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-24"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg aria-hidden className="h-5 w-5 text-ink-soft" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search leads, quotes, vehicles…"
            className="h-14 flex-1 text-base outline-none"
          />
          <kbd className="rounded border border-line bg-mist px-1.5 py-0.5 text-xs text-ink-soft">
            esc
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && <p className="px-3 py-4 text-sm text-ink-soft">Searching…</p>}
          {!loading && query && results.length === 0 && (
            <p className="px-3 py-4 text-sm text-ink-soft">No results for “{query}”.</p>
          )}
          {!loading &&
            results.map((r, i) => (
              <button
                key={`${r.kind}-${r.id}`}
                type="button"
                onClick={() => {
                  router.push(r.href);
                  onClose();
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start ${
                  i === active ? "bg-accent-soft" : ""
                }`}
              >
                <span className="rounded-md bg-mist px-1.5 py-0.5 text-xs font-medium uppercase text-ink-soft">
                  {r.kind}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-ink-soft">{r.subtitle}</span>
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
