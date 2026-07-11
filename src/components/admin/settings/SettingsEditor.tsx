"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Setting } from "@/lib/types";

export function SettingsEditor({ initialSettings }: { initialSettings: Setting[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [settings, setSettings] = useState(initialSettings);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function saveValue(key: string, value: string) {
    const { error } = await supabase.from("settings").update({ value }).eq("key", key);
    if (error) return flash(`Save failed: ${error.message}`);
    setSettings((s) => s.map((row) => (row.key === key ? { ...row, value } : row)));
    flash(`Saved ${key}.`);
  }

  async function togglePublic(row: Setting) {
    const { error } = await supabase
      .from("settings")
      .update({ is_public: !row.is_public })
      .eq("key", row.key);
    if (error) return flash(`Save failed: ${error.message}`);
    setSettings((s) =>
      s.map((r) => (r.key === row.key ? { ...r, is_public: !r.is_public } : r)),
    );
  }

  async function addSetting(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const key = String(fd.get("key") ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    const value = String(fd.get("value") ?? "");
    if (!key) return;
    const { data, error } = await supabase
      .from("settings")
      .insert({ key, value, is_public: false, description: String(fd.get("description") ?? "") })
      .select()
      .single();
    if (error || !data) return flash(`Add failed: ${error?.message}`);
    setSettings((s) => [...s, data as Setting].sort((a, b) => a.key.localeCompare(b.key)));
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Site configuration — customer login URL, contact details, disclaimer
        override, feature flags. Public keys are readable by the website.
      </p>

      <div className="mt-6 space-y-3">
        {settings.map((row) => (
          <div key={row.key} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-semibold">{row.key}</p>
                {row.description && (
                  <p className="text-xs text-ink-soft">{row.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => togglePublic(row)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  row.is_public ? "bg-accent-soft text-accent-strong" : "bg-mist text-ink-soft"
                }`}
                title="Toggle public readability"
              >
                {row.is_public ? "public" : "internal"}
              </button>
            </div>
            {row.key.includes("text") || row.value.length > 80 ? (
              <textarea
                defaultValue={row.value}
                rows={3}
                onBlur={(e) => {
                  if (e.target.value !== row.value) saveValue(row.key, e.target.value);
                }}
                className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
              />
            ) : (
              <input
                defaultValue={row.value}
                onBlur={(e) => {
                  if (e.target.value !== row.value) saveValue(row.key, e.target.value);
                }}
                className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={addSetting} className="mt-6 rounded-2xl border border-dashed border-line p-4">
        <h2 className="text-sm font-semibold">Add setting</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input name="key" placeholder="key_name" required className="rounded-xl border border-line px-3 py-2 text-sm" />
          <input name="value" placeholder="value" className="rounded-xl border border-line px-3 py-2 text-sm" />
          <input name="description" placeholder="description" className="rounded-xl border border-line px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Add
        </button>
      </form>

      {toast && (
        <div role="status" className="fixed bottom-4 start-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
