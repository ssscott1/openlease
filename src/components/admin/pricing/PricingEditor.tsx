"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PricingConfigRow, Vehicle } from "@/lib/types";
import { weeklyPrice } from "@/lib/pricing";

const KNOWN_ITEMS = [
  "insurance",
  "servicing",
  "maintenance",
  "tyres",
  "rego",
  "roadside",
  "delivery",
];

export function PricingEditor({
  initialConfig,
  vehicles,
}: {
  initialConfig: PricingConfigRow;
  vehicles: Vehicle[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [config, setConfig] = useState(initialConfig);
  const [multipliers, setMultipliers] = useState<[string, number][]>(
    Object.entries(initialConfig.term_multipliers).sort(
      (a, b) => Number(a[0]) - Number(b[0]),
    ),
  );
  const [items, setItems] = useState<string[]>(initialConfig.included_items);
  const [customItem, setCustomItem] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const previewMultipliers = Object.fromEntries(
    multipliers.filter(([m, x]) => m !== "" && Number(x) > 0),
  );
  const previewTerms = [9, 12, 15, 18, 24].filter(
    (t) => t >= config.term_min_months && t <= config.term_max_months,
  );

  async function save() {
    setBusy(true);
    const term_multipliers = Object.fromEntries(
      multipliers
        .filter(([m, x]) => m !== "" && Number(m) > 0 && Number(x) > 0)
        .map(([m, x]) => [String(Number(m)), Number(x)]),
    );
    const { error } = await supabase
      .from("pricing_config")
      .update({
        term_min_months: config.term_min_months,
        term_max_months: config.term_max_months,
        included_km_per_week: config.included_km_per_week,
        excess_km_rate: config.excess_km_rate,
        term_multipliers,
        included_items: items,
      })
      .eq("id", config.id);
    setBusy(false);
    if (error) return flash(`Save failed: ${error.message}`);
    flash("Saved — the public quoting tool is already using these numbers.");
  }

  const input =
    "mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-1 text-sm text-ink-soft">
        These rules drive every price shown on the website and in the CRM, live.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Terms & kilometres</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">
              Min term (months)
              <input type="number" min={1} value={config.term_min_months}
                onChange={(e) => setConfig((c) => ({ ...c, term_min_months: Number(e.target.value) }))}
                className={input} />
            </label>
            <label className="text-sm font-medium">
              Max term (months)
              <input type="number" min={1} value={config.term_max_months}
                onChange={(e) => setConfig((c) => ({ ...c, term_max_months: Number(e.target.value) }))}
                className={input} />
            </label>
            <label className="text-sm font-medium">
              Included km / week
              <input type="number" min={1} value={config.included_km_per_week}
                onChange={(e) => setConfig((c) => ({ ...c, included_km_per_week: Number(e.target.value) }))}
                className={input} />
            </label>
            <label className="text-sm font-medium">
              Excess rate ($/km)
              <input type="number" min={0} step="0.01" value={config.excess_km_rate}
                onChange={(e) => setConfig((c) => ({ ...c, excess_km_rate: Number(e.target.value) }))}
                className={input} />
            </label>
          </div>

          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Term multipliers
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            Anchor points; in-between terms (like 15 months) interpolate linearly.
          </p>
          <div className="mt-3 space-y-2">
            {multipliers.map(([months, factor], i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="number"
                  value={months}
                  min={1}
                  aria-label="Months"
                  onChange={(e) =>
                    setMultipliers((ms) => ms.map((m, j) => (j === i ? [e.target.value, m[1]] : m)))
                  }
                  className="w-24 rounded-xl border border-line px-3 py-2 text-sm"
                />
                <span className="text-sm text-ink-soft">months ×</span>
                <input
                  type="number"
                  step="0.01"
                  min={0.1}
                  value={factor}
                  aria-label="Multiplier"
                  onChange={(e) =>
                    setMultipliers((ms) => ms.map((m, j) => (j === i ? [m[0], Number(e.target.value)] : m)))
                  }
                  className="w-28 rounded-xl border border-line px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setMultipliers((ms) => ms.filter((_, j) => j !== i))}
                  aria-label="Remove anchor"
                  className="rounded-lg border border-line px-2 py-1.5 text-xs text-ink-soft hover:border-red-300 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMultipliers((ms) => [...ms, ["", 1]])}
              className="rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-ink-soft"
            >
              + Add anchor
            </button>
          </div>

          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Included items
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...new Set([...KNOWN_ITEMS, ...items])].map((item) => {
              const on = items.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setItems((list) => (on ? list.filter((i) => i !== item) : [...list, item]))
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    on
                      ? "border-accent bg-accent-soft text-accent-strong"
                      : "border-line text-ink-soft hover:border-ink-soft"
                  }`}
                >
                  {on ? "✓ " : ""}{item}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={customItem}
              onChange={(e) => setCustomItem(e.target.value)}
              placeholder="Custom item key"
              className="flex-1 rounded-xl border border-line px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const key = customItem.trim().toLowerCase().replace(/\s+/g, "_");
                if (key && !items.includes(key)) setItems((l) => [...l, key]);
                setCustomItem("");
              }}
              className="rounded-xl border border-line px-3 py-1.5 text-sm font-medium"
            >
              Add
            </button>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="mt-6 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save pricing"}
          </button>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Live preview
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            Weekly prices per vehicle at key terms with the values above.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                  <th className="py-2 pe-3 text-start font-semibold">Vehicle</th>
                  {previewTerms.map((t) => (
                    <th key={t} className="px-2 py-2 text-end font-semibold">{t}mo</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pe-3 font-medium">{v.name}</td>
                    {previewTerms.map((t) => (
                      <td key={t} className="px-2 py-2 text-end tabular-nums">
                        ${weeklyPrice(Number(v.base_weekly_rate), t, previewMultipliers)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-4 start-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
