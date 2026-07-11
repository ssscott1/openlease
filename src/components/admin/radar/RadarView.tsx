"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Lead, Quote } from "@/lib/types";
import { leaseEnds, type LeaseEndInfo } from "@/lib/admin/metrics";
import { formatAud, formatDate } from "@/lib/format";
import { toCsv, downloadCsv } from "@/lib/admin/csv";
import type { QuoteWithVehicleName } from "@/app/(admin)/admin/(app)/radar/page";

const BUCKETS = [
  { key: "overdue", label: "Overdue", test: (d: number) => d < 0, tone: "border-red-300 bg-red-50" },
  { key: "30", label: "Next 30 days", test: (d: number) => d >= 0 && d <= 30, tone: "border-amber-300 bg-amber-50" },
  { key: "60", label: "31–60 days", test: (d: number) => d > 30 && d <= 60, tone: "border-line bg-white" },
  { key: "90", label: "61–90 days", test: (d: number) => d > 60 && d <= 90, tone: "border-line bg-white" },
  { key: "later", label: "Later", test: (d: number) => d > 90, tone: "border-line bg-white" },
] as const;

export function RadarView({
  leads,
  quotes,
}: {
  leads: Lead[];
  quotes: QuoteWithVehicleName[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [toast, setToast] = useState<string | null>(null);
  const [handled, setHandled] = useState<Map<string, string>>(new Map());

  const rows = useMemo(
    () => leaseEnds(leads, quotes as Quote[]),
    [leads, quotes],
  );
  const vehicleName = (q: Quote) =>
    (q as QuoteWithVehicleName).vehicles?.name ?? "Vehicle";

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function startRelease(info: LeaseEndInfo) {
    // Duplicate the lease quote as a fresh draft — the starting point of a
    // re-lease conversation.
    const { error } = await supabase.from("quotes").insert({
      lead_id: info.lead.id,
      vehicle_id: info.quote.vehicle_id,
      term_months: info.quote.term_months,
      weekly_price: info.quote.weekly_price,
      included_km_per_week: info.quote.included_km_per_week,
      total_contract_value: info.quote.total_contract_value,
      status: "draft",
    });
    if (error) return flash(`Re-lease failed: ${error.message}`);
    await supabase.from("activities").insert({
      lead_id: info.lead.id,
      type: "system",
      body: "Re-lease started from end-of-term radar (draft quote created)",
    });
    setHandled((m) => new Map(m).set(info.lead.id, "Re-lease draft created"));
    flash(`Draft re-lease quote created for ${info.lead.name}.`);
  }

  async function scheduleCollection(info: LeaseEndInfo) {
    const when = new Date(info.endDate);
    when.setDate(when.getDate() - 7);
    const { error } = await supabase
      .from("leads")
      .update({
        next_action: "Schedule end-of-term collection",
        next_action_at: when.toISOString(),
      })
      .eq("id", info.lead.id);
    if (error) return flash(`Failed: ${error.message}`);
    await supabase.from("activities").insert({
      lead_id: info.lead.id,
      type: "system",
      body: `Collection scheduled from radar — reminder ${formatDate(when)}`,
    });
    setHandled((m) => new Map(m).set(info.lead.id, "Collection scheduled"));
    flash(`Collection reminder set for ${info.lead.name}.`);
  }

  function exportRadar() {
    downloadCsv(
      `end-of-term-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        rows.map((r) => ({
          name: r.lead.name,
          email: r.lead.email,
          phone: r.lead.phone,
          vehicle: vehicleName(r.quote),
          weekly: Number(r.quote.weekly_price),
          delivery: r.lead.delivery_date,
          term_months: r.quote.term_months,
          end_date: r.endDate.toISOString().slice(0, 10),
          days_left: r.daysLeft,
          status: r.lead.status,
        })),
        [
          { key: "name", header: "Name" },
          { key: "email", header: "Email" },
          { key: "phone", header: "Phone" },
          { key: "vehicle", header: "Vehicle" },
          { key: "weekly", header: "Weekly $" },
          { key: "delivery", header: "Delivered" },
          { key: "term_months", header: "Term (mo)" },
          { key: "end_date", header: "Ends" },
          { key: "days_left", header: "Days left" },
          { key: "status", header: "Status" },
        ],
      ),
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">End-of-term radar</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Every lease approaching term end — re-lease, extend, or schedule
            collection before the customer flies out.
          </p>
        </div>
        <button
          type="button"
          onClick={exportRadar}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-ink-soft hover:text-ink"
        >
          Export CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-line p-10 text-center">
          <h2 className="text-lg font-semibold">No tracked leases yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            Set a <strong>delivery date</strong> on a lead with a quote and it
            appears here with its computed end-of-term date.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {BUCKETS.map((bucket) => {
            const inBucket = rows.filter((r) => bucket.test(r.daysLeft));
            if (inBucket.length === 0) return null;
            return (
              <section key={bucket.key}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  {bucket.label} · {inBucket.length}
                </h2>
                <div className="mt-2 space-y-2">
                  {inBucket.map((info) => (
                    <div
                      key={info.lead.id}
                      className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${bucket.tone}`}
                    >
                      <div className="min-w-0 flex-1">
                        <Link href={`/admin/leads/${info.lead.id}`} className="font-semibold hover:underline">
                          {info.lead.name}
                        </Link>
                        <p className="text-xs text-ink-soft">
                          {vehicleName(info.quote)} · {formatAud(Number(info.quote.weekly_price))}/wk ·
                          delivered {info.lead.delivery_date ? formatDate(info.lead.delivery_date) : "—"} ·
                          {" "}{info.quote.term_months}mo → ends {formatDate(info.endDate)}
                        </p>
                        {handled.get(info.lead.id) && (
                          <p className="mt-1 text-xs font-medium text-accent-strong">
                            ✓ {handled.get(info.lead.id)}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold tabular-nums shadow-sm">
                        {info.daysLeft < 0 ? `${-info.daysLeft}d overdue` : `${info.daysLeft}d`}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => startRelease(info)}
                          className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-strong"
                        >
                          Start re-lease
                        </button>
                        <button
                          type="button"
                          onClick={() => scheduleCollection(info)}
                          className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium hover:border-ink-soft"
                        >
                          Schedule collection
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-4 start-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
