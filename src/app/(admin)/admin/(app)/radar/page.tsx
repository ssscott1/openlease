import { createClient } from "@/lib/supabase/server";
import type { Lead, Quote, Vehicle } from "@/lib/types";
import { RadarView } from "@/components/admin/radar/RadarView";

export type QuoteWithVehicleName = Quote & { vehicles: Pick<Vehicle, "name"> | null };

export default async function RadarPage() {
  const supabase = await createClient();
  const [leadsRes, quotesRes] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .or("delivery_date.not.is.null,term_anchor_date.not.is.null"),
    supabase.from("quotes").select("*, vehicles(name)"),
  ]);

  return (
    <RadarView
      leads={(leadsRes.data ?? []) as Lead[]}
      quotes={(quotesRes.data ?? []) as QuoteWithVehicleName[]}
    />
  );
}
