import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/admin/auth";
import type { AuditLogEntry, Profile } from "@/lib/types";
import { timeAgo } from "@/lib/admin/status";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string }>;
}) {
  const session = await getStaffSession();
  if (session?.profile.role !== "admin") redirect("/admin");

  const { page: pageParam, entity } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (entity) query = query.eq("entity", entity);

  const [{ data, count }, { data: profiles }] = await Promise.all([
    query,
    supabase.from("profiles").select("*"),
  ]);
  const entries = (data ?? []) as AuditLogEntry[];
  const staffById = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const entities = ["leads", "quotes", "vehicles", "pricing_config", "settings", "applications"];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every mutation across the CRM and website — who, what, when.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/admin/audit"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${!entity ? "border-accent bg-accent-soft text-accent-strong" : "border-line text-ink-soft"}`}
        >
          All
        </a>
        {entities.map((e) => (
          <a
            key={e}
            href={`/admin/audit?entity=${e}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${entity === e ? "border-accent bg-accent-soft text-accent-strong" : "border-line text-ink-soft"}`}
          >
            {e}
          </a>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
        {entries.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">No audit entries yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((entry) => (
              <li key={entry.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                    entry.action === "INSERT"
                      ? "bg-emerald-100 text-emerald-800"
                      : entry.action === "DELETE"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-800"
                  }`}>
                    {entry.action}
                  </span>
                  <span className="font-mono text-xs">{entry.entity}</span>
                  <span className="text-ink-soft">
                    by {entry.actor_id ? (staffById.get(entry.actor_id)?.full_name ?? "staff") : "public site"}
                  </span>
                  <span className="ms-auto text-xs text-ink-soft">{timeAgo(entry.created_at)}</span>
                </div>
                {entry.detail != null && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-ink-soft hover:text-ink">
                      Detail
                    </summary>
                    <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-mist p-3 text-xs">
                      {JSON.stringify(entry.detail, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <a href={`/admin/audit?page=${page - 1}${entity ? `&entity=${entity}` : ""}`} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-ink-soft">
              ← Newer
            </a>
          )}
          <span className="text-ink-soft">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a href={`/admin/audit?page=${page + 1}${entity ? `&entity=${entity}` : ""}`} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-ink-soft">
              Older →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
