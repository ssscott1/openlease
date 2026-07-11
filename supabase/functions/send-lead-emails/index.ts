// Supabase Edge Function: send-lead-emails
// Sends (1) a customer confirmation and (2) an internal new-lead alert via
// Resend. Configure RESEND_API_KEY and EMAIL_FROM as function secrets; the
// internal recipient comes from the `lead_alert_email` settings row.
// Without RESEND_API_KEY the function logs and reports { sent: false } so
// lead capture keeps working in development.

import { createClient } from "jsr:@supabase/supabase-js@2";

interface Payload {
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

const aud = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);

function customerEmail(p: Payload): { subject: string; html: string } {
  if (p.kind === "quote" && p.quote) {
    const q = p.quote;
    return {
      subject: `Your OpenLease quote — ${q.vehicleName}, ${q.termMonths} months`,
      // TODO(i18n): send localised templates based on lead.preferredLanguage
      // once professional translations are approved.
      html: `
        <h2>Your OpenLease quote</h2>
        <p>Hi ${p.lead.name},</p>
        <p>Here's the quote you built — we're holding this price for you.</p>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><td><strong>Car</strong></td><td>${q.vehicleName} (brand new)</td></tr>
          <tr><td><strong>Term</strong></td><td>${q.termMonths} months — matched to your visa</td></tr>
          <tr><td><strong>Weekly price</strong></td><td><strong>${aud(q.weeklyPrice)}/week</strong> — everything included except fuel</td></tr>
          <tr><td><strong>Included</strong></td><td>Insurance, servicing, maintenance, tyres, rego &amp; CTP, roadside, delivery &amp; collection</td></tr>
          <tr><td><strong>Kilometres</strong></td><td>${q.includedKmPerWeek} km/week included</td></tr>
          <tr><td><strong>Total contract value</strong></td><td>${aud(q.totalContractValue)}</td></tr>
        </table>
        <p>Our team will be in touch within one business day. No Australian credit
        history is needed — approval is on your employment contract, salary and visa.</p>
        <p style="color:#6b7280;font-size:12px">Pricing is indicative, based on up to
        ${q.includedKmPerWeek} km per week, and confirmed on application, subject to
        assessment and approval. OpenLease agreements are consumer leases provided
        under applicable Australian consumer credit law.</p>
      `,
    };
  }
  return {
    subject: "Thanks for your partnership enquiry — OpenLease",
    html: `
      <h2>Thanks, ${p.lead.name}</h2>
      <p>We've received your enquiry${p.lead.company ? ` for ${p.lead.company}` : ""}.
      A partnerships lead will contact you within one business day.</p>
    `,
  };
}

function internalEmail(p: Payload): { subject: string; html: string } {
  const rows = [
    `<tr><td><strong>Name</strong></td><td>${p.lead.name}</td></tr>`,
    `<tr><td><strong>Email</strong></td><td>${p.lead.email}</td></tr>`,
    p.lead.phone ? `<tr><td><strong>Phone</strong></td><td>${p.lead.phone}</td></tr>` : "",
    p.lead.company ? `<tr><td><strong>Company</strong></td><td>${p.lead.company}</td></tr>` : "",
    `<tr><td><strong>Language</strong></td><td>${p.lead.preferredLanguage ?? "en"}</td></tr>`,
    p.quote
      ? `<tr><td><strong>Quote</strong></td><td>${p.quote.vehicleName}, ${p.quote.termMonths}mo @ ${aud(p.quote.weeklyPrice)}/wk (total ${aud(p.quote.totalContractValue)})</td></tr>`
      : "",
    p.lead.message ? `<tr><td><strong>Message</strong></td><td>${p.lead.message}</td></tr>` : "",
  ].join("");
  return {
    subject:
      p.kind === "partner"
        ? `New PARTNER enquiry: ${p.lead.name}`
        : `New lead: ${p.lead.name} — ${p.quote?.vehicleName ?? ""}`,
    html: `<h2>New ${p.kind} lead</h2><table cellpadding="6">${rows}</table>
      <p>Lead ID: ${p.lead.id}</p>`,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
  }
  if (!payload?.lead?.email || !payload?.lead?.name) {
    return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: alertSetting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "lead_alert_email")
    .maybeSingle();
  const alertEmail = alertSetting?.value ?? "";

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "OpenLease <onboarding@resend.dev>";

  if (!resendKey) {
    console.log("RESEND_API_KEY not set — skipping email send", {
      to: payload.lead.email,
      alertEmail,
      kind: payload.kind,
    });
    return new Response(JSON.stringify({ ok: true, sent: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const send = async (to: string, subject: string, html: string) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) console.error("resend error", res.status, await res.text());
    return res.ok;
  };

  const customer = customerEmail(payload);
  const internal = internalEmail(payload);

  const results = await Promise.all([
    send(payload.lead.email, customer.subject, customer.html),
    alertEmail ? send(alertEmail, internal.subject, internal.html) : Promise.resolve(true),
  ]);

  return new Response(
    JSON.stringify({ ok: true, sent: results.every(Boolean) }),
    { headers: { "Content-Type": "application/json" } },
  );
});
