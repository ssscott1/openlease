import { createClient } from "@/lib/supabase/server";
import type { PricingConfigRow, Vehicle } from "./types";

/** Active vehicles for the public car slider, in display order. */
export async function getActiveVehicles(): Promise<Vehicle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Vehicle[];
}

/** The live pricing rules that drive the quoting tool. */
export async function getPricingConfig(): Promise<PricingConfigRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pricing_config")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PricingConfigRow | null;
}
