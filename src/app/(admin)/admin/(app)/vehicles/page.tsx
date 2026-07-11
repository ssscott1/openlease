import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/admin/auth";
import type { Vehicle } from "@/lib/types";
import { VehicleManager } from "@/components/admin/vehicles/VehicleManager";

export default async function VehiclesPage() {
  const session = await getStaffSession();
  if (session?.profile.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .order("sort_order");

  return <VehicleManager initialVehicles={(data ?? []) as Vehicle[]} />;
}
