import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { notifyLead } from "@/lib/notify";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** B2B partner enquiry → lead with source = "partner" (spec §4, section 7). */
export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    message?: string;
    locale?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  if (!name || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const leadId = randomUUID();

  const { error } = await supabase.from("leads").insert({
    id: leadId,
    name,
    email,
    phone: body.phone?.trim() ?? "",
    employer: body.company?.trim() ?? "",
    preferred_language: body.locale ?? "en",
    source: "partner",
    use_case: "other",
    status: "new",
    next_action: body.message?.trim().slice(0, 500) ?? "",
  });
  if (error) {
    console.error("partner lead insert failed", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  notifyLead({
    kind: "partner",
    lead: {
      id: leadId,
      name,
      email,
      phone: body.phone?.trim() ?? "",
      preferredLanguage: body.locale ?? "en",
      company: body.company?.trim() ?? "",
      message: body.message?.trim() ?? "",
    },
  }).catch((err) => console.error("notification failed", err));

  return NextResponse.json({ ok: true });
}
