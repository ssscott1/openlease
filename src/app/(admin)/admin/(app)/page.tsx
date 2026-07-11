import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Lead, Quote } from "@/lib/types";
import { PIPELINE_ORDER, STATUS_COLORS, STATUS_LABELS } from "@/lib/admin/status";
import { countBy, leaseEnds } from "@/lib/admin/metrics";
import { formatAud, formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [leadsRes, quotesRes] = await Promise.all([
    supabase.from("leads").select("*"),
    supabase.from("quotes").select("*"),
  ]);
  const leads = (leadsRes.data ?? []) as Lead[];
  const quotes = (quotesRes.data ?? []) as Quote[];

  const now = Date.now();
  const days = (n: number) => now - n * 86_400_000;
  const newLeads7 = leads.filter((l) => new Date(l.created_at).getTime() > days(7)).length;
  const newLeads30 = leads.filter((l) => new Date(l.created_at).getTime() > days(30)).length;

  const activeLeads = leads.filter((l) => l.status === "active");
  const quotesByLead = new Map<string, Quote[]>();
  for (const q of quotes) {
    const list = quotesByLead.get(q.lead_id) ?? [];
    list.push(q);
    quotesByLead.set(q.lead_id, list);
  }
  const weeklyRevenue = activeLeads.reduce((sum, lead) => {
    const list = quotesByLead.get(lead.id) ?? [];
    const quote = list.find((q) => q.status === "converted") ?? list[0];
    return sum + (quote ? Number(quote.weekly_price) : 0);
  }, 0);

  const won = leads.filter((l) =>
    ["approved", "delivered", "active", "ended"].includes(l.status),
  ).length;
  const closed = won + leads.filter((l) => l.status === "lost").length;
  const conversion = closed > 0 ? Math.round((won / closed) * 100) : null;

  const ends = leaseEnds(leads, quotes);
  const endingSoon = ends.filter((e) => e.daysLeft <= 90 && e.daysLeft > -30);

  const bySource = countBy(leads, (l) => l.source);
  const byLanguage = countBy(leads, (l) => l.preferred_language);
  const statusCounts = new Map(countBy(leads, (l) => l.status));
  const maxStatus = Math.max(1, ...statusCounts.values());

  const recent = [...leads]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      {/* Stat tiles */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="New leads (7d)" value={String(newLeads7)} sub={`${newLeads30} in 30 days`} />
        <Stat label="Active leases" value={String(activeLeads.length)} sub={`${leads.length} leads total`} />
        <Stat label="Weekly revenue" value={formatAud(weeklyRevenue)} sub="sum of active weekly prices" />
        <Stat
          label="Conversion"
          value={conversion === null ? "—" : `${conversion}%`}
          sub="won vs closed"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Pipeline</h2>
            <Link href="/admin/pipeline" className="text-sm font-medium text-accent-strong hover:underline">
              Open board →
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {PIPELINE_ORDER.map((status) => {
              const count = statusCounts.get(status) ?? 0;
              return (
                <li key={status} className="flex items-center gap-3">
                  <span className={`w-28 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${STATUS_COLORS[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-mist">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(count / maxStatus) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-end text-sm font-medium tabular-nums">{count}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* End-of-term radar preview */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
              End-of-term radar (90 days)
            </h2>
            <Link href="/admin/radar" className="text-sm font-medium text-accent-strong hover:underline">
              Full radar →
            </Link>
          </div>
          {endingSoon.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">
              No leases ending in the next 90 days.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {endingSoon.slice(0, 5).map(({ lead, quote, endDate, daysLeft }) => (
                <li key={lead.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/leads/${lead.id}`} className="truncate text-sm font-medium hover:underline">
                      {lead.name}
                    </Link>
                    <p className="text-xs text-ink-soft">
                      {quote.term_months}mo · {formatAud(Number(quote.weekly_price))}/wk · ends {formatDate(endDate)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    daysLeft < 0 ? "bg-red-100 text-red-700" : daysLeft <= 30 ? "bg-amber-100 text-amber-800" : "bg-mist text-ink-soft"
                  }`}>
                    {daysLeft < 0 ? `${-daysLeft}d overdue` : `${daysLeft}d left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sources & languages */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Leads by source & language
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-6">
            <BreakdownList title="Source" rows={bySource} />
            <BreakdownList title="Language" rows={byLanguage} />
          </div>
        </section>

        {/* Recent leads */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
            Latest leads
          </h2>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">
              Nothing yet — site quotes land here in real time.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {recent.map((lead) => (
                <li key={lead.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/leads/${lead.id}`} className="truncate text-sm font-medium hover:underline">
                      {lead.name}
                    </Link>
                    <p className="truncate text-xs text-ink-soft">
                      {lead.email} · {lead.source} · {lead.preferred_language.toUpperCase()}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>
    </div>
  );
}

function BreakdownList({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <div>
      <h3 className="text-xs font-semibold text-ink-soft">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {rows.length === 0 && <li className="text-sm text-ink-soft">—</li>}
        {rows.slice(0, 6).map(([key, count]) => (
          <li key={key} className="flex items-center gap-2 text-sm">
            <span className="w-16 truncate">{key}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-accent/70" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="w-6 text-end text-xs tabular-nums text-ink-soft">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
