import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/admin/auth";
import type { PricingConfigRow, Vehicle } from "@/lib/types";
import { PricingEditor } from "@/components/admin/pricing/PricingEditor";

export default async function PricingPage() {
  const session = await getStaffSession();
  if (session?.profile.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const [{ data: config }, { data: vehicles }] = await Promise.all([
    supabase.from("pricing_config").select("*").limit(1).maybeSingle(),
    supabase.from("vehicles").select("*").eq("active", true).order("sort_order"),
  ]);

  if (!config) {
    return (
      <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
        No pricing config row found — run the seed migration.
      </p>
    );
  }

  return (
    <PricingEditor
      initialConfig={config as PricingConfigRow}
      vehicles={(vehicles ?? []) as Vehicle[]}
    />
  );
}
