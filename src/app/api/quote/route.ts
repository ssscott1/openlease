import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { computeQuote } from "@/lib/pricing";
import type { PricingConfigRow, Vehicle } from "@/lib/types";
import { notifyLead } from "@/lib/notify";

interface QuoteRequestBody {
  vehicleId?: string;
  termMonths?: number;
  name?: string;
  email?: string;
  phone?: string;
  employer?: string;
  visaType?: string;
  visaExpiry?: string;
  locale?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The controlled lead + quote insert path (spec §3). Pricing is recomputed
 * server-side from pricing_config — the client's displayed price is never
 * trusted. Inserts run through the anon Supabase client so RLS remains the
 * enforcement layer.
 */
export async function POST(request: NextRequest) {
  let body: QuoteRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const termMonths = Number(body.termMonths);

  if (!name || !EMAIL_RE.test(email) || !body.vehicleId || !Number.isFinite(termMonths)) {
    return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  }

  const supabase = await createClient();

  const [vehicleRes, configRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*")
      .eq("id", body.vehicleId)
      .eq("active", true)
      .maybeSingle(),
    supabase.from("pricing_config").select("*").limit(1).maybeSingle(),
  ]);

  const vehicle = vehicleRes.data as Vehicle | null;
  const config = configRes.data as PricingConfigRow | null;
  if (!vehicle || !config) {
    return NextResponse.json({ error: "unavailable" }, { status: 422 });
  }

  const quote = computeQuote(Number(vehicle.base_weekly_rate), termMonths, config);

  // Client-generated ids so the anon role needs INSERT only (no SELECT).
  const leadId = randomUUID();
  const quoteId = randomUUID();

  const { error: leadError } = await supabase.from("leads").insert({
    id: leadId,
    name,
    email,
    phone,
    employer: body.employer?.trim() ?? "",
    visa_type: body.visaType?.trim() ?? "",
    visa_expiry: body.visaExpiry || null,
    preferred_language: body.locale ?? "en",
    source: "website",
    status: "new",
  });
  if (leadError) {
    console.error("lead insert failed", leadError);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const { error: quoteError } = await supabase.from("quotes").insert({
    id: quoteId,
    lead_id: leadId,
    vehicle_id: vehicle.id,
    term_months: quote.termMonths,
    weekly_price: quote.weekly,
    included_km_per_week: config.included_km_per_week,
    total_contract_value: quote.total,
    status: "sent",
  });
  if (quoteError) {
    console.error("quote insert failed", quoteError);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // Customer confirmation + internal alert — fire and forget; a mail outage
  // must never lose the lead.
  notifyLead({
    kind: "quote",
    lead: { id: leadId, name, email, phone, preferredLanguage: body.locale ?? "en" },
    quote: {
      id: quoteId,
      vehicleName: vehicle.name,
      termMonths: quote.termMonths,
      weeklyPrice: quote.weekly,
      totalContractValue: quote.total,
      includedKmPerWeek: config.included_km_per_week,
    },
  }).catch((err) => console.error("notification failed", err));

  return NextResponse.json({
    ok: true,
    quote: {
      termMonths: quote.termMonths,
      weeklyPrice: quote.weekly,
      totalContractValue: quote.total,
      weeks: quote.weeks,
    },
  });
}
