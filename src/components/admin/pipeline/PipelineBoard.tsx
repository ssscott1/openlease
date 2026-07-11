"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus, Profile } from "@/lib/types";
import {
  PIPELINE_ORDER,
  STATUS_COLORS,
  STATUS_LABELS,
  timeAgo,
} from "@/lib/admin/status";
import { toCsv, downloadCsv } from "@/lib/admin/csv";
import type { QuoteWithVehicle } from "@/app/(admin)/admin/(app)/pipeline/page";
import { NewLeadModal } from "./NewLeadModal";

type View = "board" | "table";
type SortKey = "created_at" | "name" | "status" | "visa_expiry";

export function PipelineBoard({
  initialLeads,
  quotes,
  staff,
}: {
  initialLeads: Lead[];
  quotes: QuoteWithVehicle[];
  staff: Profile[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [leads, setLeads] = useState(initialLeads);
  const [view, setView] = useState<View>("board");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<LeadStatus | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(searchParams.get("new") === "1");

  // Table state
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterOwner, setFilterOwner] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const quotesByLead = useMemo(() => {
    const map = new Map<string, QuoteWithVehicle[]>();
    for (const q of quotes) {
      const list = map.get(q.lead_id) ?? [];
      list.push(q);
      map.set(q.lead_id, list);
    }
    return map;
  }, [quotes]);

  const staffById = useMemo(
    () => new Map(staff.map((s) => [s.id, s])),
    [staff],
  );

  const sources = useMemo(
    () => [...new Set(leads.map((l) => l.source))].sort(),
    [leads],
  );

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }

  async function moveLead(leadId: string, status: LeadStatus) {
    const prev = leads;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === status) return;
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, status } : l)));
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", leadId);
    if (error) {
      setLeads(prev);
      flash(`Couldn't move ${lead.name}: ${error.message}`);
    }
  }

  async function bulkUpdate(patch: Partial<Pick<Lead, "status" | "owner_id">>) {
    const ids = [...selected];
    if (ids.length === 0) return;
    const prev = leads;
    setLeads((ls) =>
      ls.map((l) => (selected.has(l.id) ? { ...l, ...patch } : l)),
    );
    const { error } = await supabase.from("leads").update(patch).in("id", ids);
    if (error) {
      setLeads(prev);
      flash(`Bulk update failed: ${error.message}`);
    } else {
      flash(`Updated ${ids.length} lead${ids.length > 1 ? "s" : ""}.`);
      setSelected(new Set());
    }
  }

  function exportCsv(rows: Lead[]) {
    downloadCsv(
      `leads-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        rows.map((l) => ({
          ...l,
          owner: l.owner_id ? (staffById.get(l.owner_id)?.full_name ?? "") : "",
        })),
        [
          { key: "name", header: "Name" },
          { key: "email", header: "Email" },
          { key: "phone", header: "Phone" },
          { key: "employer", header: "Employer" },
          { key: "visa_type", header: "Visa type" },
          { key: "visa_expiry", header: "Visa expiry" },
          { key: "preferred_language", header: "Language" },
          { key: "source", header: "Source" },
          { key: "status", header: "Status" },
          { key: "owner", header: "Owner" },
          { key: "created_at", header: "Created" },
        ],
      ),
    );
  }

  const filtered = useMemo(() => {
    let rows = leads;
    if (filterStatus) rows = rows.filter((l) => l.status === filterStatus);
    if (filterSource) rows = rows.filter((l) => l.source === filterSource);
    if (filterOwner)
      rows = rows.filter((l) =>
        filterOwner === "unassigned" ? !l.owner_id : l.owner_id === filterOwner,
      );
    const dir = sortAsc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [leads, filterStatus, filterSource, filterOwner, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line p-0.5" role="tablist" aria-label="View">
            {(["board", "table"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                  view === v ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-ink-soft hover:text-ink"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            New lead <kbd className="ms-1 rounded bg-white/20 px-1 text-xs">n</kbd>
          </button>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
            <svg aria-hidden className="h-7 w-7 text-accent-strong" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </span>
          <h2 className="mt-4 text-lg font-semibold">No leads yet</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-soft">
            Leads land here automatically when someone builds a quote on the
            website — or add one manually.
          </p>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            Add your first lead
          </button>
        </div>
      ) : view === "board" ? (
        <div className="no-scrollbar -mx-4 mt-5 flex flex-1 gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
          {PIPELINE_ORDER.map((status) => {
            const column = leads.filter((l) => l.status === status);
            return (
              <section
                key={status}
                aria-label={STATUS_LABELS[status]}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget(status);
                }}
                onDragLeave={() => setDropTarget((t) => (t === status ? null : t))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropTarget(null);
                  if (dragId) moveLead(dragId, status);
                  setDragId(null);
                }}
                className={`flex w-64 shrink-0 flex-col rounded-xl border p-2 transition-colors ${
                  dropTarget === status
                    ? "border-accent bg-accent-soft/60"
                    : "border-transparent bg-white/60"
                }`}
              >
                <header className="flex items-center justify-between px-2 py-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs font-medium text-ink-soft">{column.length}</span>
                </header>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                  {column.map((lead) => {
                    const quote = quotesByLead.get(lead.id)?.[0];
                    const owner = lead.owner_id ? staffById.get(lead.owner_id) : null;
                    return (
                      <Link
                        key={lead.id}
                        href={`/admin/leads/${lead.id}`}
                        draggable
                        onDragStart={() => setDragId(lead.id)}
                        onDragEnd={() => setDragId(null)}
                        className={`block cursor-grab rounded-xl border border-line bg-white p-3 transition hover:border-accent/50 ${
                          dragId === lead.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{lead.name}</span>
                          <span className="shrink-0 text-xs text-ink-soft">{timeAgo(lead.created_at)}</span>
                        </div>
                        {quote && (
                          <p className="mt-1 truncate text-xs text-ink-soft">
                            {quote.vehicles?.name ?? "—"} · {quote.term_months}mo · ${Math.round(quote.weekly_price)}/wk
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-ink-soft">
                            {lead.source}
                          </span>
                          <span className="rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium uppercase text-ink-soft">
                            {lead.preferred_language}
                          </span>
                          {owner && (
                            <span
                              title={owner.full_name}
                              className="ms-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent-strong"
                            >
                              {owner.full_name.slice(0, 1).toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm" aria-label="Filter by status">
              <option value="">All statuses</option>
              {PIPELINE_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm" aria-label="Filter by source">
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm" aria-label="Filter by owner">
              <option value="">All owners</option>
              <option value="unassigned">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
            {selected.size > 0 && (
              <div className="ms-auto flex items-center gap-2 rounded-lg bg-ink px-3 py-1.5 text-sm text-white">
                <span>{selected.size} selected</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) bulkUpdate({ status: e.target.value as LeadStatus });
                    e.target.value = "";
                  }}
                  className="rounded bg-white/10 px-1.5 py-0.5 text-xs"
                  aria-label="Bulk set status"
                >
                  <option value="" disabled>Set status…</option>
                  {PIPELINE_ORDER.map((s) => (
                    <option key={s} value={s} className="text-ink">{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) bulkUpdate({ owner_id: e.target.value === "none" ? null : e.target.value });
                    e.target.value = "";
                  }}
                  className="rounded bg-white/10 px-1.5 py-0.5 text-xs"
                  aria-label="Bulk assign owner"
                >
                  <option value="" disabled>Assign to…</option>
                  <option value="none" className="text-ink">Unassigned</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id} className="text-ink">{s.full_name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => exportCsv(filtered.filter((l) => selected.has(l.id)))} className="rounded bg-white/10 px-2 py-0.5 text-xs">
                  Export
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-start text-xs uppercase tracking-wide text-ink-soft">
                  <th className="w-10 p-3">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={selected.size > 0 && filtered.every((l) => selected.has(l.id))}
                      onChange={(e) =>
                        setSelected(e.target.checked ? new Set(filtered.map((l) => l.id)) : new Set())
                      }
                    />
                  </th>
                  {(
                    [
                      ["name", "Name"],
                      ["status", "Status"],
                      ["visa_expiry", "Visa expiry"],
                      ["created_at", "Created"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <th key={key} className="p-3 text-start">
                      <button type="button" onClick={() => toggleSort(key)} className="font-semibold hover:text-ink">
                        {label} {sortKey === key ? (sortAsc ? "↑" : "↓") : ""}
                      </button>
                    </th>
                  ))}
                  <th className="p-3 text-start font-semibold">Quote</th>
                  <th className="p-3 text-start font-semibold">Source</th>
                  <th className="p-3 text-start font-semibold">Owner</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => {
                  const quote = quotesByLead.get(lead.id)?.[0];
                  return (
                    <tr key={lead.id} className="border-b border-line/60 last:border-0 hover:bg-mist/60">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${lead.name}`}
                          checked={selected.has(lead.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(lead.id);
                            else next.delete(lead.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <Link href={`/admin/leads/${lead.id}`} className="font-medium hover:underline">
                          {lead.name}
                        </Link>
                        <p className="text-xs text-ink-soft">{lead.email}</p>
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[lead.status]}`}>
                          {STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      <td className="p-3 text-ink-soft">{lead.visa_expiry ?? "—"}</td>
                      <td className="p-3 text-ink-soft">{timeAgo(lead.created_at)}</td>
                      <td className="p-3 text-ink-soft">
                        {quote ? `${quote.vehicles?.name ?? ""} ${quote.term_months}mo $${Math.round(quote.weekly_price)}/wk` : "—"}
                      </td>
                      <td className="p-3 text-ink-soft">{lead.source}</td>
                      <td className="p-3 text-ink-soft">
                        {lead.owner_id ? (staffById.get(lead.owner_id)?.full_name ?? "—") : "—"}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-ink-soft">
                      No leads match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-4 start-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {showNew && (
        <NewLeadModal
          onClose={() => {
            setShowNew(false);
            router.replace("/admin/pipeline");
          }}
          onCreated={(lead) => {
            setLeads((ls) => [lead, ...ls]);
            setShowNew(false);
            router.push(`/admin/leads/${lead.id}`);
          }}
        />
      )}
    </div>
  );
}
