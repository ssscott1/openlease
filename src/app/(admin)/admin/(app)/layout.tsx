import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStaffSession();
  if (!session) {
    // Signed in but not (active) staff — or session expired. Back to login.
    redirect("/admin/login?reason=unauthorised");
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
