import type { Lead, Quote, UseCase } from "@/lib/types";

export const USE_CASE_LABELS: Record<UseCase, string> = {
  visa: "Visa",
  contract: "Contract",
  project: "Project",
  relocation: "Relocation",
  car_delivery_bridge: "Bridge",
  other: "Other",
};

export const USE_CASE_COLORS: Record<UseCase, string> = {
  visa: "bg-blue-100 text-blue-800",
  contract: "bg-amber-100 text-amber-800",
  project: "bg-orange-100 text-orange-800",
  relocation: "bg-violet-100 text-violet-800",
  car_delivery_bridge: "bg-teal-100 text-teal-800",
  other: "bg-gray-200 text-gray-700",
};

/** Bridge and Other leads default to manual underwriting review (spec §4). */
export function needsManualReview(useCase: UseCase): boolean {
  return useCase === "car_delivery_bridge" || useCase === "other";
}

export interface ChecklistItem {
  key: string;
  label: string;
}

/** Use-case-specific document verification checklists (spec §4). */
export const VERIFICATION_CHECKLISTS: Record<UseCase, ChecklistItem[]> = {
  visa: [
    { key: "employment_contract", label: "Employment contract" },
    { key: "payslips", label: "Payslips" },
    { key: "visa_grant", label: "Visa grant notice" },
  ],
  contract: [
    { key: "signed_contract", label: "Signed fixed-term contract" },
    { key: "payslips", label: "Payslips" },
  ],
  project: [{ key: "engagement_letter", label: "Engagement letter / contract" }],
  relocation: [{ key: "assignment_letter", label: "Assignment letter" }],
  car_delivery_bridge: [{ key: "income_evidence", label: "Income evidence" }],
  other: [{ key: "income_evidence", label: "Income evidence" }],
};

export type AnchorSanity = "ok" | "warn" | "hard";

/**
 * Term-vs-anchor sanity: flags a lead whose selected term runs PAST its
 * anchor date. Hard compliance flag for visa leads, warning for the rest.
 * Uses delivery date as the term start when set, else lead creation.
 */
export function anchorSanity(
  lead: Pick<Lead, "term_anchor_date" | "delivery_date" | "created_at" | "use_case">,
  quote: Pick<Quote, "term_months"> | null | undefined,
): AnchorSanity | null {
  if (!lead.term_anchor_date || !quote) return null;
  const start = new Date(lead.delivery_date ?? lead.created_at);
  const end = new Date(start);
  end.setMonth(end.getMonth() + quote.term_months);
  if (end.getTime() <= new Date(lead.term_anchor_date).getTime() + 86_400_000) {
    return "ok";
  }
  return lead.use_case === "visa" ? "hard" : "warn";
}
