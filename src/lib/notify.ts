/**
 * Bridges the site to the `send-lead-emails` Supabase Edge Function, which
 * sends the customer confirmation and the internal new-lead alert.
 * Failures are logged by callers and never block lead capture.
 */

export interface LeadNotification {
  kind: "quote" | "partner";
  lead: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    preferredLanguage?: string;
    company?: string;
    message?: string;
  };
  quote?: {
    id: string;
    vehicleName: string;
    termMonths: number;
    weeklyPrice: number;
    totalContractValue: number;
    includedKmPerWeek: number;
  };
}

export async function notifyLead(payload: LeadNotification): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return;

  const res = await fetch(`${url}/functions/v1/send-lead-emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`send-lead-emails responded ${res.status}`);
  }
}
