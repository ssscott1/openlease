import { createClient } from "@/lib/supabase/server";
import type { Lead, Profile, Quote, Vehicle } from "@/lib/types";
import { PipelineBoard } from "@/components/admin/pipeline/PipelineBoard";

export type QuoteWithVehicle = Quote & { vehicles: Pick<Vehicle, "name"> | null };

export default async function PipelinePage() {
  const supabase = await createClient();

  const [leadsRes, quotesRes, profilesRes] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("*, vehicles(name)")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("active", true),
  ]);

  return (
    <PipelineBoard
      initialLeads={(leadsRes.data ?? []) as Lead[]}
      quotes={(quotesRes.data ?? []) as QuoteWithVehicle[]}
      staff={(profilesRes.data ?? []) as Profile[]}
    />
  );
}
