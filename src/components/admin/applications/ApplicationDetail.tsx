"use client";

/**
 * Compliance boundary (spec §4.3).
 *
 * Quoting is free; the moment a quote becomes an APPLICATION it enters this
 * gated flow. Each checkpoint below is a responsible-lending / disclosure
 * step required before an OpenLease consumer lease can be approved under
 * applicable Australian consumer credit law.
 *
 * v1 records each step manually (who ticked it, when). The TODOs mark where
 * real integrations replace the manual tick:
 *
 * TODO(compliance): identity_verified        → integrate IDV/KYC provider (e.g. DVS check)
 * TODO(compliance): income_verified          → payslip/bank verification or employer contract review workflow
 * TODO(compliance): visa_verified            → VEVO check integration
 * TODO(compliance): not_unsuitable_assessment→ structured requirements & objectives questionnaire + affordability calculation, stored immutably
 * TODO(compliance): disclosure_document_sent → generate & deliver the disclosure document; store the delivered artefact
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Application, ApplicationStatus, Lead, Quote, Vehicle } from "@/lib/types";
import { formatAud } from "@/lib/format";
import { timeAgo } from "@/lib/admin/status";

const CHECKS: { key: string; label: string; description: string }[] = [
  {
    key: "identity_verified",
    label: "Identity verified",
    description: "Passport + Australian address confirmed (KYC).",
  },
  {
    key: "income_verified",
    label: "Income & employment verified",
    description: "Employment contract and salary evidence reviewed.",
  },
  {
    key: "visa_verified",
    label: "Visa verified",
    description: "Visa class and expiry confirmed (VEVO); lease term fits visa.",
  },
  {
    key: "not_unsuitable_assessment",
    label: "'Not unsuitable' assessment",
    description: "Requirements, objectives and affordability assessed and recorded.",
  },
  {
    key: "disclosure_document_sent",
    label: "Disclosure document sent",
    description: "Pre-contractual disclosure delivered to the applicant.",
  },
];

const STATUS_FLOW: ApplicationStatus[] = [
  "draft",
  "identity_pending",
  "verification_pending",
  "assessment_pending",
  "disclosure_pending",
  "submitted",
];

export function ApplicationDetail({
  initialApp,
  lead,
  quote,
}: {
  initialApp: Application;
  lead: Lead;
  quote: Quote & { vehicles: Pick<Vehicle, "name"> | null };
}) {
  const supabase = useMemo(() => createClient(), []);
  const [app, setApp] = useState(initialApp);
  const [toast, setToast] = useState<string | null>(null);

  const allChecked = CHECKS.every((c) => app.checks[c.key]);
  const decided = app.status === "approved" || app.status === "declined";

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function nextStatus(checks: Record<string, string | null>): ApplicationStatus {
    if (!checks.identity_verified) return "identity_pending";
    if (!checks.income_verified || !checks.visa_verified) return "verification_pending";
    if (!checks.not_unsuitable_assessment) return "assessment_pending";
    if (!checks.disclosure_document_sent) return "disclosure_pending";
    return "submitted";
  }

  async function toggleCheck(key: string) {
    if (decided) return;
    const checks = { ...app.checks, [key]: app.checks[key] ? null : new Date().toISOString() };
    const status = nextStatus(checks);
    const prev = app;
    setApp((a) => ({ ...a, checks, status }));
    const { error } = await supabase
      .from("applications")
      .update({ checks, status })
      .eq("id", app.id);
    if (error) {
      setApp(prev);
      flash(`Save failed: ${error.message}`);
    }
  }

  async function decide(status: "approved" | "declined") {
    if (status === "approved" && !allChecked) return;
    const prev = app;
    setApp((a) => ({ ...a, status }));
    const { error } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", app.id);
    if (error) {
      setApp(prev);
      flash(`Update failed: ${error.message}`);
      return;
    }
    await supabase
      .from("leads")
      .update({ status: status === "approved" ? "approved" : "lost" })
      .eq("id", lead.id);
    await supabase.from("activities").insert({
      lead_id: lead.id,
      type: "system",
      body: `Application ${status}`,
    });
    flash(`Application ${status}.`);
  }

  async function saveNotes(notes: string) {
    const { error } = await supabase
      .from("applications")
      .update({ notes })
      .eq("id", app.id);
    if (error) flash(`Save failed: ${error.message}`);
    else setApp((a) => ({ ...a, notes }));
  }

  const doneCount = CHECKS.filter((c) => app.checks[c.key]).length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/admin/leads/${lead.id}`} className="text-sm text-ink-soft hover:text-ink">
        ← {lead.name}
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Application</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {quote.vehicles?.name ?? "Vehicle"} · {quote.term_months} months ·{" "}
            {formatAud(Number(quote.weekly_price))}/wk · created {timeAgo(app.created_at)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            app.status === "approved"
              ? "bg-emerald-100 text-emerald-800"
              : app.status === "declined"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-800"
          }`}
        >
          {app.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Progress */}
      {!decided && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span>
              {doneCount} of {CHECKS.length} checks complete
            </span>
            <span>
              stage {Math.min(STATUS_FLOW.indexOf(app.status) + 1, STATUS_FLOW.length)} / {STATUS_FLOW.length}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(doneCount / CHECKS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <section className="mt-6 rounded-xl border border-line bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Responsible-lending & disclosure checklist
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          All five checkpoints must be completed and recorded before approval.
          Manual for now — each will be backed by an integrated verification
          step (see code TODOs).
        </p>
        <ul className="mt-4 space-y-3">
          {CHECKS.map((check) => {
            const done = app.checks[check.key];
            return (
              <li key={check.key} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleCheck(check.key)}
                  disabled={decided}
                  aria-pressed={Boolean(done)}
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    done
                      ? "border-accent bg-accent text-white"
                      : "border-line hover:border-accent"
                  } ${decided ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {done && (
                    <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="text-xs text-ink-soft">{check.description}</p>
                  {done && (
                    <p className="mt-0.5 text-xs text-accent-strong">
                      Completed {timeAgo(done)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-4 rounded-xl border border-line bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Assessment notes
        </h2>
        <textarea
          defaultValue={app.notes}
          rows={4}
          onBlur={(e) => {
            if (e.target.value !== app.notes) saveNotes(e.target.value);
          }}
          placeholder="Record the applicant's requirements & objectives, affordability rationale, and any conditions…"
          className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm focus:outline-2 focus:outline-accent"
        />
      </section>

      {!decided && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => decide("approved")}
            disabled={!allChecked}
            title={allChecked ? "" : "Complete all checks first"}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            Approve application
          </button>
          <button
            type="button"
            onClick={() => decide("declined")}
            className="rounded-full border border-red-300 px-6 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
          >
            Decline
          </button>
          {!allChecked && (
            <p className="text-xs text-ink-soft">
              Approval unlocks when every checkpoint is recorded.
            </p>
          )}
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-4 start-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
