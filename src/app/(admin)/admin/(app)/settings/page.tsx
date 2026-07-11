import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/admin/auth";
import type { Setting } from "@/lib/types";
import { SettingsEditor } from "@/components/admin/settings/SettingsEditor";

export default async function SettingsPage() {
  const session = await getStaffSession();
  if (session?.profile.role !== "admin") redirect("/admin");

  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").order("key");

  return <SettingsEditor initialSettings={(data ?? []) as Setting[]} />;
}
