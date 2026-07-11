// Row types mirroring the Supabase schema (supabase/migrations).

export type StaffRole = "admin" | "sales";

export type LeadStatus =
  | "new"
  | "contacted"
  | "application"
  | "approved"
  | "delivered"
  | "active"
  | "ended"
  | "lost";

export type QuoteStatus = "draft" | "sent" | "converted";

export type ActivityType = "note" | "call" | "email" | "status_change" | "system";

export type UseCase =
  | "visa"
  | "contract"
  | "project"
  | "relocation"
  | "car_delivery_bridge"
  | "other";

export const USE_CASES: UseCase[] = [
  "visa",
  "contract",
  "project",
  "relocation",
  "car_delivery_bridge",
  "other",
];

export type ApplicationStatus =
  | "draft"
  | "identity_pending"
  | "verification_pending"
  | "assessment_pending"
  | "disclosure_pending"
  | "submitted"
  | "approved"
  | "declined";

export interface Vehicle {
  id: string;
  slug: string;
  name: string;
  descriptor: string;
  long_description: string;
  image_url: string | null;
  base_weekly_rate: number;
  sort_order: number;
  active: boolean;
  body_type: string;
  fuel_economy: string;
  seats: number;
  created_at: string;
  updated_at: string;
}

export interface PricingConfigRow {
  id: string;
  term_min_months: number;
  term_max_months: number;
  term_multipliers: Record<string, number>;
  included_km_per_week: number;
  excess_km_rate: number;
  included_items: string[];
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
  is_public: boolean;
  description: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  employer: string;
  visa_type: string;
  visa_expiry: string | null;
  use_case: UseCase;
  term_anchor_date: string | null;
  use_case_detail: string;
  verification: Record<string, string | null>;
  preferred_language: string;
  source: string;
  status: LeadStatus;
  owner_id: string | null;
  next_action: string;
  next_action_at: string | null;
  delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  lead_id: string;
  vehicle_id: string;
  term_months: number;
  weekly_price: number;
  included_km_per_week: number;
  total_contract_value: number;
  status: QuoteStatus;
  created_at: string;
}

export interface Activity {
  id: string;
  lead_id: string;
  type: ActivityType;
  body: string;
  staff_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: StaffRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  lead_id: string;
  quote_id: string;
  status: ApplicationStatus;
  checks: Record<string, string | null>;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "application",
  "approved",
  "delivered",
  "active",
  "ended",
  "lost",
];
