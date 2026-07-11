import { createClient } from "@/lib/supabase/server";

export const DEFAULT_CUSTOMER_LOGIN_URL = "https://www.karia.com.au";

/**
 * Read a value from the `settings` key/value table. Public-readable keys are
 * exposed via RLS; everything falls back so a missing row or a cold database
 * never breaks the page.
 */
export async function getSetting(
  key: string,
  fallback: string,
): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getSettings(
  keys: string[],
): Promise<Record<string, string>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", keys);
    return Object.fromEntries(
      (data ?? []).map((row) => [row.key, row.value as string]),
    );
  } catch {
    return {};
  }
}
