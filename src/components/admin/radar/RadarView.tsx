"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Lead, Quote, UseCase } from "@/lib/types";
import { USE_CASES } from "@/lib/types";
import { leaseEnds, type LeaseEndInfo } from "@/lib/admin/metrics";
import { USE_CASE_LABELS, anchorSanity } from "@/lib/admin/usecase";
import { UseCaseBadge } from "@/components/admin/UseCaseBadge";
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
  const [useCaseFilter, setUseCaseFilter] = useState<Set<UseCase>>(new Set());
  const [dropOffFor, setDropOffFor] = useState<LeaseEndInfo | null>(null);

  const allRows = useMemo(
    () => leaseEnds(leads, quotes as Quote[]),
    [leads, quotes],
  );
  const rows = useMemo(
    () =>
      useCaseFilter.size === 0
        ? allRows
        : allRows.filter((r) => useCaseFilter.has(r.lead.use_case)),
    [allRows, useCaseFilter],
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

  async function scheduleDropOff(
    info: LeaseEndInfo,
    date: string,
    location: string,
  ) {
    const { error } = await supabase
      .from("leads")
      .update({
        next_action: `Customer drop-off — ${location || "location TBC"}`,
        next_action_at: date ? new Date(date).toISOString() : null,
      })
      .eq("id", info.lead.id);
    if (error) return flash(`Failed: ${error.message}`);
    await supabase.from("activities").insert({
      lead_id: info.lead.id,
      type: "system",
      body: `Drop-off scheduled from radar — ${date ? formatDate(date) : "date TBC"}${location ? `, ${location}` : ""}`,
    });
    setHandled((m) => new Map(m).set(info.lead.id, "Drop-off scheduled"));
    setDropOffFor(null);
    flash(`Drop-off scheduled for ${info.lead.name}.`);
  }

  function exportRadar() {
    downloadCsv(
      `end-of-term-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        rows.map((r) => ({
          name: r.lead.name,
          email: r.lead.email,
          phone: r.lead.phone,
          use_case: r.lead.use_case,
          anchor_date: r.lead.term_anchor_date,
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
          { key: "use_case", header: "Use case" },
          { key: "anchor_date", header: "Anchor date" },
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
            Every lease approaching its end — re-lease, extend, or schedule
            the customer&apos;s drop-off before their timeline runs out.
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

      {/* Use-case filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        {USE_CASES.map((uc) => {
          const on = useCaseFilter.has(uc);
          return (
            <button
              key={uc}
              type="button"
              onClick={() =>
                setUseCaseFilter((prev) => {
                  const next = new Set(prev);
                  if (on) next.delete(uc);
                  else next.add(uc);
                  return next;
                })
              }
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                on
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-line text-ink-soft hover:border-ink-soft"
              }`}
            >
              {on ? "✓ " : ""}
              {USE_CASE_LABELS[uc]}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-line p-10 text-center">
          <h2 className="text-lg font-semibold">Nothing on the radar</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            Leads appear here once they have a quote plus a{" "}
            <strong>delivery date</strong> or a <strong>term anchor date</strong>{" "}
            (visa expiry, contract end, …).
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
                  {inBucket.map((info) => {
                    const sanity = anchorSanity(info.lead, info.quote);
                    return (
                      <div
                        key={info.lead.id}
                        className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${bucket.tone}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/admin/leads/${info.lead.id}`} className="font-semibold hover:underline">
                              {info.lead.name}
                            </Link>
                            <UseCaseBadge useCase={info.lead.use_case} />
                            {sanity === "hard" && (
                              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                term past visa
                              </span>
                            )}
                            {sanity === "warn" && (
                              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
                                term past anchor
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            {vehicleName(info.quote)} · {formatAud(Number(info.quote.weekly_price))}/wk ·
                            {info.lead.delivery_date
                              ? ` delivered ${formatDate(info.lead.delivery_date)} · ${info.quote.term_months}mo`
                              : ` anchor ${info.lead.term_anchor_date ? formatDate(info.lead.term_anchor_date) : "—"}`}
                            {" "}→ ends {formatDate(info.endDate)}
                          </p>
                          {handled.get(info.lead.id) && (
                            <p className="mt-1 text-xs font-medium text-accent-strong">
                              ✓ {handled.get(info.lead.id)}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold tabular-nums">
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
                            onClick={() => setDropOffFor(info)}
                            className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium hover:border-ink-soft"
                          >
                            Schedule drop-off
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Schedule drop-off modal */}
      {dropOffFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setDropOffFor(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Schedule drop-off"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              scheduleDropOff(
                dropOffFor,
                String(fd.get("date") ?? ""),
                String(fd.get("location") ?? "").trim(),
              );
            }}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-semibold">
              Schedule drop-off — {dropOffFor.lead.name}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              The customer drops the car off with us. Capture their preferred
              date and location.
            </p>
            <label className="mt-4 block text-sm font-medium">
              Preferred drop-off date
              <input
                type="date"
                name="date"
                defaultValue={dropOffFor.endDate.toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Drop-off location
              <input
                name="location"
                placeholder="e.g. Perth depot, airport"
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDropOffFor(null)}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
              >
                Schedule drop-off
              </button>
            </div>
          </form>
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
