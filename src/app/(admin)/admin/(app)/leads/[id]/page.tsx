import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Activity, Application, Lead, Profile, Quote, Vehicle } from "@/lib/types";
import { LeadDetail } from "@/components/admin/leads/LeadDetail";

export type QuoteFull = Quote & { vehicles: Pick<Vehicle, "id" | "name"> | null };

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [leadRes, quotesRes, activitiesRes, staffRes, appsRes, vehiclesRes] =
    await Promise.all([
      supabase.from("leads").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("quotes")
        .select("*, vehicles(id, name)")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("activities")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("active", true),
      supabase.from("applications").select("*").eq("lead_id", id),
      supabase.from("vehicles").select("*").order("sort_order"),
    ]);

  if (!leadRes.data) notFound();

  return (
    <LeadDetail
      initialLead={leadRes.data as Lead}
      initialQuotes={(quotesRes.data ?? []) as QuoteFull[]}
      initialActivities={(activitiesRes.data ?? []) as Activity[]}
      initialApplications={(appsRes.data ?? []) as Application[]}
      staff={(staffRes.data ?? []) as Profile[]}
      vehicles={(vehiclesRes.data ?? []) as Vehicle[]}
    />
  );
}
