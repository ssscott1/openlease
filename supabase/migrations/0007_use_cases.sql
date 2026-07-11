-- Expand beyond visa holders: every lead carries a use case and a
-- term-anchor date (the end date its lease term should not outrun).
-- Existing leads are all visa-era: migrate them accordingly. No data loss.

create type lead_use_case as enum (
  'visa', 'contract', 'project', 'relocation', 'car_delivery_bridge', 'other'
);

alter table public.leads
  add column if not exists use_case lead_use_case not null default 'other',
  add column if not exists term_anchor_date date,
  add column if not exists use_case_detail text not null default '',
  -- Per-use-case document verification checklist: key -> ISO timestamp when
  -- verified (null/absent = outstanding). Definitions live in the CRM.
  add column if not exists verification jsonb not null default '{}';

-- Migrate existing leads: all pre-expansion leads are visa leads; the visa
-- expiry was their implicit term anchor.
update public.leads
set use_case = 'visa',
    term_anchor_date = coalesce(term_anchor_date, visa_expiry);

-- Terms now run 9–36 months. Multipliers stay flat at the 24-month baseline
-- beyond 24 (adjustable in the CRM pricing editor).
update public.pricing_config
set term_max_months = greatest(term_max_months, 36),
    term_multipliers = term_multipliers || '{"36": 1.0}'::jsonb;

-- Optional homepage "Bridging" card is feature-flagged.
insert into public.settings (key, value, is_public, description) values
  ('feature_bridging_card', 'true', true, 'Show the Bridging card in the Made-for-your-situation section')
on conflict (key) do nothing;
