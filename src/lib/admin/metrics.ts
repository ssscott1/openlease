import type { Lead, Quote } from "@/lib/types";

export interface LeaseEndInfo {
  lead: Lead;
  quote: Quote;
  endDate: Date;
  daysLeft: number;
}

/**
 * End-of-term math, for every use case: when a delivery date is set the
 * lease end is delivery + term of the converted (else most recent) quote;
 * otherwise the lead's term_anchor_date (visa expiry, contract end, …)
 * stands in as the expected end.
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
    const leadQuotes = byLead.get(lead.id) ?? [];
    const quote =
      leadQuotes.find((q) => q.status === "converted") ?? leadQuotes[0];
    if (!quote) continue;

    let end: Date;
    if (lead.delivery_date) {
      end = new Date(lead.delivery_date);
      end.setMonth(end.getMonth() + quote.term_months);
    } else if (lead.term_anchor_date) {
      end = new Date(lead.term_anchor_date);
    } else {
      continue;
    }

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
