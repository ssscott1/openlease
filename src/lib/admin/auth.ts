import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface StaffSession {
  userId: string;
  email: string;
  profile: Profile;
}

/**
 * Resolve the signed-in staff member. Returns null when the user is not
 * signed in, has no profile row, or has been deactivated — RLS is the real
 * enforcement; this feeds the UI and layout gate.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.active) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: profile as Profile,
  };
}
