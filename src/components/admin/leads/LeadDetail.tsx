"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Activity,
  ActivityType,
  Application,
  Lead,
  LeadStatus,
  Profile,
  Vehicle,
} from "@/lib/types";
import {
  PIPELINE_ORDER,
  STATUS_COLORS,
  STATUS_LABELS,
  timeAgo,
} from "@/lib/admin/status";
import type { QuoteFull } from "@/app/(admin)/admin/(app)/leads/[id]/page";

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  note: "M16.862 4.487 18.549 2.8a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z",
  call: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z",
  email: "M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75",
  status_change: "M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5",
  system: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z",
};

export function LeadDetail({
  initialLead,
  initialQuotes,
  initialActivities,
  initialApplications,
  staff,
  vehicles,
}: {
  initialLead: Lead;
  initialQuotes: QuoteFull[];
  initialActivities: Activity[];
  initialApplications: Application[];
  staff: Profile[];
  vehicles: Vehicle[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [lead, setLead] = useState(initialLead);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [activities, setActivities] = useState(initialActivities);
  const [applications, setApplications] = useState(initialApplications);
  const [toast, setToast] = useState<string | null>(null);
  const [noteType, setNoteType] = useState<ActivityType>("note");
  const [noteBusy, setNoteBusy] = useState(false);

  const staffById = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function patchLead(patch: Partial<Lead>, refreshTimeline = false) {
    const prev = lead;
    setLead((l) => ({ ...l, ...patch }));
    const { error } = await supabase.from("leads").update(patch).eq("id", lead.id);
    if (error) {
      setLead(prev);
      flash(`Save failed: ${error.message}`);
    } else if (refreshTimeline) {
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      if (data) setActivities(data as Activity[]);
    }
  }

  async function addActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = String(fd.get("body") ?? "").trim();
    if (!body) return;
    setNoteBusy(true);
    const { data, error } = await supabase
      .from("activities")
      .insert({ lead_id: lead.id, type: noteType, body })
      .select()
      .single();
    setNoteBusy(false);
    if (error || !data) {
      flash(`Couldn't add ${noteType}: ${error?.message}`);
      return;
    }
    setActivities((a) => [data as Activity, ...a]);
    (e.target as HTMLFormElement).reset();
  }

  async function resendQuote(quote: QuoteFull) {
    const { error } = await supabase.functions.invoke("send-lead-emails", {
      body: {
        kind: "quote",
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          preferredLanguage: lead.preferred_language,
        },
        quote: {
          id: quote.id,
          vehicleName: quote.vehicles?.name ?? "Vehicle",
          termMonths: quote.term_months,
          weeklyPrice: Number(quote.weekly_price),
          totalContractValue: Number(quote.total_contract_value),
          includedKmPerWeek: quote.included_km_per_week,
        },
      },
    });
    if (error) {
      flash(`Re-send failed: ${error.message}`);
      return;
    }
    const { data } = await supabase
      .from("activities")
      .insert({
        lead_id: lead.id,
        type: "email",
        body: `Quote re-sent: ${quote.vehicles?.name ?? ""} ${quote.term_months}mo at $${Math.round(Number(quote.weekly_price))}/wk`,
      })
      .select()
      .single();
    if (data) setActivities((a) => [data as Activity, ...a]);
    flash("Quote re-sent.");
  }

  async function duplicateQuote(quote: QuoteFull) {
    const { data, error } = await supabase
      .from("quotes")
      .insert({
        lead_id: lead.id,
        vehicle_id: quote.vehicle_id,
        term_months: quote.term_months,
        weekly_price: quote.weekly_price,
        included_km_per_week: quote.included_km_per_week,
        total_contract_value: quote.total_contract_value,
        status: "draft",
      })
      .select("*, vehicles(id, name)")
      .single();
    if (error || !data) {
      flash(`Duplicate failed: ${error?.message}`);
      return;
    }
    setQuotes((q) => [data as QuoteFull, ...q]);
    flash("Quote duplicated as draft.");
  }

  async function convertQuote(quote: QuoteFull) {
    // Compliance boundary (spec §4.3): converting a quote opens a gated
    // application with responsible-lending checkpoints, all unmet.
    const { data: app, error } = await supabase
      .from("applications")
      .insert({ lead_id: lead.id, quote_id: quote.id, status: "identity_pending" })
      .select()
      .single();
    if (error || !app) {
      flash(`Convert failed: ${error?.message}`);
      return;
    }
    await supabase.from("quotes").update({ status: "converted" }).eq("id", quote.id);
    setQuotes((qs) =>
      qs.map((q) => (q.id === quote.id ? { ...q, status: "converted" } : q)),
    );
    setApplications((a) => [app as Application, ...a]);
    await patchLead({ status: "application" }, true);
    router.push(`/admin/applications/${app.id}`);
  }

  async function deleteLead() {
    if (!confirm(`Delete ${lead.name} and all related quotes/activities? This cannot be undone.`)) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) {
      flash(`Delete failed: ${error.message} (admin only)`);
      return;
    }
    router.replace("/admin/pipeline");
  }

  const input =
    "w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/pipeline" className="text-sm text-ink-soft hover:text-ink">
          ← Pipeline
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {lead.source} · {lead.preferred_language.toUpperCase()} · created {timeAgo(lead.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink-soft">
            Status
            <select
              value={lead.status}
              onChange={(e) => patchLead({ status: e.target.value as LeadStatus }, true)}
              className={`ms-2 rounded-full px-3 py-1.5 text-sm font-semibold ${STATUS_COLORS[lead.status]}`}
            >
              {PIPELINE_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink-soft">
            Owner
            <select
              value={lead.owner_id ?? ""}
              onChange={(e) => patchLead({ owner_id: e.target.value || null })}
              className="ms-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium"
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Contact & visa */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Contact & visa
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["email", "Email", "email"],
                  ["phone", "Phone", "tel"],
                  ["employer", "Employer", "text"],
                  ["visa_type", "Visa type", "text"],
                ] as const
              ).map(([field, label, type]) => (
                <label key={field} className="text-xs font-medium text-ink-soft">
                  {label}
                  <input
                    type={type}
                    defaultValue={lead[field] ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (lead[field] ?? ""))
                        patchLead({ [field]: e.target.value } as Partial<Lead>);
                    }}
                    className={`mt-1 ${input}`}
                  />
                </label>
              ))}
              <label className="text-xs font-medium text-ink-soft">
                Visa expiry
                <input
                  type="date"
                  defaultValue={lead.visa_expiry ?? ""}
                  onBlur={(e) => {
                    if ((e.target.value || null) !== lead.visa_expiry)
                      patchLead({ visa_expiry: e.target.value || null });
                  }}
                  className={`mt-1 ${input}`}
                />
              </label>
              <label className="text-xs font-medium text-ink-soft">
                Delivery date (drives end-of-term radar)
                <input
                  type="date"
                  defaultValue={lead.delivery_date ?? ""}
                  onBlur={(e) => {
                    if ((e.target.value || null) !== lead.delivery_date)
                      patchLead({ delivery_date: e.target.value || null });
                  }}
                  className={`mt-1 ${input}`}
                />
              </label>
            </div>
          </section>

          {/* Quotes */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Quotes
            </h2>
            {quotes.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">
                No quotes yet — site quotes appear here automatically.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {quotes.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {q.vehicles?.name ?? "Vehicle"} · {q.term_months} months
                      </p>
                      <p className="text-xs text-ink-soft">
                        ${Math.round(Number(q.weekly_price))}/wk · total $
                        {Math.round(Number(q.total_contract_value)).toLocaleString()} ·{" "}
                        {q.included_km_per_week} km/wk · {timeAgo(q.created_at)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      q.status === "converted"
                        ? "bg-emerald-100 text-emerald-800"
                        : q.status === "draft"
                          ? "bg-gray-200 text-gray-700"
                          : "bg-blue-100 text-blue-800"
                    }`}>
                      {q.status}
                    </span>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => resendQuote(q)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:border-ink-soft">
                        Re-send
                      </button>
                      <button type="button" onClick={() => duplicateQuote(q)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:border-ink-soft">
                        Duplicate
                      </button>
                      {q.status !== "converted" && (
                        <button type="button" onClick={() => convertQuote(q)} className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white hover:bg-accent-strong">
                          Convert → application
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {applications.length > 0 && (
              <div className="mt-3 border-t border-line pt-3">
                {applications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/admin/applications/${app.id}`}
                    className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm hover:bg-amber-100"
                  >
                    <span className="font-medium">Application</span>
                    <span className="text-xs font-semibold uppercase text-amber-800">
                      {app.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Timeline */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Timeline
            </h2>
            <form onSubmit={addActivity} className="mt-3 flex gap-2">
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as ActivityType)}
                className="rounded-xl border border-line px-2 py-2 text-sm"
                aria-label="Activity type"
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
              </select>
              <input
                name="body"
                placeholder={`Log a ${noteType}…`}
                className={input}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={noteBusy}
                className="shrink-0 rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Add
              </button>
            </form>
            <ol className="mt-4 space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist">
                    <svg aria-hidden className="h-3.5 w-3.5 text-ink-soft" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={ACTIVITY_ICONS[a.type]} />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm">{a.body}</p>
                    <p className="text-xs text-ink-soft">
                      {a.type.replace(/_/g, " ")} ·{" "}
                      {a.staff_id ? (staffById.get(a.staff_id)?.full_name ?? "staff") : "system"} ·{" "}
                      {timeAgo(a.created_at)}
                    </p>
                  </div>
                </li>
              ))}
              {activities.length === 0 && (
                <li className="text-sm text-ink-soft">No activity yet.</li>
              )}
            </ol>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* Next action */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Next action
            </h2>
            <label className="mt-3 block text-xs font-medium text-ink-soft">
              What's next?
              <input
                defaultValue={lead.next_action}
                onBlur={(e) => {
                  if (e.target.value !== lead.next_action)
                    patchLead({ next_action: e.target.value });
                }}
                placeholder="e.g. Call after visa approval"
                className={`mt-1 ${input}`}
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-ink-soft">
              Reminder
              <input
                type="datetime-local"
                defaultValue={lead.next_action_at ? lead.next_action_at.slice(0, 16) : ""}
                onBlur={(e) => {
                  const value = e.target.value ? new Date(e.target.value).toISOString() : null;
                  if (value !== lead.next_action_at) patchLead({ next_action_at: value });
                }}
                className={`mt-1 ${input}`}
              />
            </label>
          </section>

          {/* New quote */}
          <NewQuoteCard
            leadId={lead.id}
            vehicles={vehicles}
            onCreated={(q) => {
              setQuotes((qs) => [q, ...qs]);
              flash("Quote created.");
            }}
            onError={(m) => flash(m)}
          />

          {/* Danger zone */}
          <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-red-700">
              Danger zone
            </h2>
            <button
              type="button"
              onClick={deleteLead}
              className="mt-3 rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              Delete lead
            </button>
            <p className="mt-2 text-xs text-red-700/70">Admins only. Removes quotes and timeline too.</p>
          </section>
        </div>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-4 start-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function NewQuoteCard({
  leadId,
  vehicles,
  onCreated,
  onError,
}: {
  leadId: string;
  vehicles: Vehicle[];
  onCreated: (q: QuoteFull) => void;
  onError: (message: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const vehicleId = String(fd.get("vehicle_id"));
    const term = Number(fd.get("term_months"));
    if (!vehicleId || !term) return;
    setBusy(true);

    // Reuse the live pricing config so CRM quotes match the site exactly.
    const [{ data: config }, vehicle] = await Promise.all([
      supabase.from("pricing_config").select("*").limit(1).maybeSingle(),
      Promise.resolve(vehicles.find((v) => v.id === vehicleId)),
    ]);
    if (!config || !vehicle) {
      setBusy(false);
      onError("Pricing config unavailable.");
      return;
    }
    const { computeQuote } = await import("@/lib/pricing");
    const quote = computeQuote(Number(vehicle.base_weekly_rate), term, config);

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        lead_id: leadId,
        vehicle_id: vehicleId,
        term_months: quote.termMonths,
        weekly_price: quote.weekly,
        included_km_per_week: config.included_km_per_week,
        total_contract_value: quote.total,
        status: "draft",
      })
      .select("*, vehicles(id, name)")
      .single();
    setBusy(false);
    if (error || !data) {
      onError(`Quote failed: ${error?.message}`);
      return;
    }
    onCreated(data as QuoteFull);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
        New quote
      </h2>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <select
          name="vehicle_id"
          required
          defaultValue=""
          className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          aria-label="Vehicle"
        >
          <option value="" disabled>Choose vehicle…</option>
          {vehicles.filter((v) => v.active).map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} (${Math.round(Number(v.base_weekly_rate))}/wk base)
            </option>
          ))}
        </select>
        <input
          name="term_months"
          type="number"
          min={1}
          max={48}
          placeholder="Term (months)"
          required
          className="w-full rounded-xl border border-line px-3 py-2 text-sm"
          aria-label="Term in months"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Pricing…" : "Create draft quote"}
        </button>
      </form>
    </section>
  );
}
