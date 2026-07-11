import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Application, Lead, Quote, Vehicle } from "@/lib/types";
import { ApplicationDetail } from "@/components/admin/applications/ApplicationDetail";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!app) notFound();

  const [{ data: lead }, { data: quote }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", app.lead_id).maybeSingle(),
    supabase
      .from("quotes")
      .select("*, vehicles(name)")
      .eq("id", app.quote_id)
      .maybeSingle(),
  ]);
  if (!lead || !quote) notFound();

  return (
    <ApplicationDetail
      initialApp={app as Application}
      lead={lead as Lead}
      quote={quote as Quote & { vehicles: Pick<Vehicle, "name"> | null }}
    />
  );
}
