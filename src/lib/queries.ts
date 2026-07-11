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

/** A single active vehicle for its detail page. */
export async function getVehicleBySlug(slug: string): Promise<Vehicle | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data as Vehicle | null;
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
