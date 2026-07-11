import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { Unauthorised } from "@/components/admin/Unauthorised";

export default async function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const session = await getStaffSession();
  if (!session) {
    // Signed in but no active staff profile. Render in place — redirecting
    // to login here would loop against the auth proxy (the session is valid).
    return <Unauthorised email={user.email ?? ""} />;
  }

  return (
    <AdminShell
      role={session.profile.role}
      name={session.profile.full_name || session.email}
    >
      {children}
    </AdminShell>
  );
}
