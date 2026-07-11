import type { Lead, Quote } from "@/lib/types";

export interface LeaseEndInfo {
  lead: Lead;
  quote: Quote;
  endDate: Date;
  daysLeft: number;
}

/**
 * End-of-term math: delivery_date + term_months of the lead's converted
 * (else most recent) quote. Leads without a delivery date aren't leases yet.
 */
export function leaseEnds(leads: Lead[], quotes: Quote[]): LeaseEndInfo[] {
  const byLead = new Map<string, Quote[]>();
  for (const q of quotes) {
    const list = byLead.get(q.lead_id) ?? [];
    list.push(q);
    byLead.set(q.lead_id, list);
  }

  const now = Date.now();
  const out: LeaseEndInfo[] = [];
  for (const lead of leads) {
    if (!lead.delivery_date) continue;
    const leadQuotes = byLead.get(lead.id) ?? [];
    const quote =
      leadQuotes.find((q) => q.status === "converted") ?? leadQuotes[0];
    if (!quote) continue;
    const end = new Date(lead.delivery_date);
    end.setMonth(end.getMonth() + quote.term_months);
    out.push({
      lead,
      quote,
      endDate: end,
      daysLeft: Math.ceil((end.getTime() - now) / 86_400_000),
    });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function countBy<T>(rows: T[], key: (row: T) => string): [string, number][] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row) || "—";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
