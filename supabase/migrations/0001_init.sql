-- OpenLease initial schema
-- Public site reads: vehicles, pricing_config, settings (public keys only).
-- Public writes: controlled insert path into leads + quotes (no reads).
-- Everything else is staff-only, enforced with RLS — not just hidden in the UI.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type staff_role as enum ('admin', 'sales');
create type lead_status as enum (
  'new', 'contacted', 'application', 'approved', 'delivered', 'active', 'ended', 'lost'
);
create type quote_status as enum ('draft', 'sent', 'converted');
create type activity_type as enum ('note', 'call', 'email', 'status_change', 'system');
create type application_status as enum (
  'draft',
  'identity_pending',
  'verification_pending',
  'assessment_pending',
  'disclosure_pending',
  'submitted',
  'approved',
  'declined'
);

-- ---------------------------------------------------------------------------
-- Staff profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role staff_role not null default 'sales',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Security-definer helpers so RLS policies can check staff membership
-- without recursing into profiles' own policies.
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Vehicles
-- ---------------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  descriptor text not null default '',
  image_url text,
  base_weekly_rate numeric(10, 2) not null check (base_weekly_rate >= 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  body_type text not null default '',
  fuel_economy text not null default '',
  seats integer not null default 5 check (seats > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pricing config (single row, CRM-editable, feeds the public quote tool live)
-- ---------------------------------------------------------------------------
create table public.pricing_config (
  id uuid primary key default gen_random_uuid(),
  term_min_months integer not null default 9 check (term_min_months > 0),
  term_max_months integer not null default 24 check (term_max_months >= term_min_months),
  term_multipliers jsonb not null default '{"9": 1.12, "12": 1.08, "18": 1.04, "24": 1.0}',
  included_km_per_week integer not null default 380 check (included_km_per_week > 0),
  excess_km_rate numeric(6, 2) not null default 0.25 check (excess_km_rate >= 0),
  included_items jsonb not null default '["insurance", "servicing", "maintenance", "tyres", "rego", "roadside", "delivery"]',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Settings (key/value; public keys readable by the site)
-- ---------------------------------------------------------------------------
create table public.settings (
  key text primary key,
  value text not null,
  is_public boolean not null default false,
  description text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  employer text not null default '',
  visa_type text not null default '',
  visa_expiry date,
  preferred_language text not null default 'en',
  source text not null default 'website',
  status lead_status not null default 'new',
  owner_id uuid references public.profiles (id) on delete set null,
  next_action text not null default '',
  next_action_at timestamptz,
  delivery_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads (status);
create index leads_owner_idx on public.leads (owner_id);
create index leads_created_idx on public.leads (created_at desc);

-- ---------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  term_months integer not null check (term_months > 0),
  weekly_price numeric(10, 2) not null check (weekly_price >= 0),
  included_km_per_week integer not null default 380,
  total_contract_value numeric(12, 2) not null check (total_contract_value >= 0),
  status quote_status not null default 'sent',
  created_at timestamptz not null default now()
);

create index quotes_lead_idx on public.quotes (lead_id);

-- ---------------------------------------------------------------------------
-- Activities (full per-lead timeline)
-- ---------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  type activity_type not null default 'note',
  body text not null default '',
  staff_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index activities_lead_idx on public.activities (lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Applications (compliance boundary, spec §4.3 — gated scaffold)
-- ---------------------------------------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  quote_id uuid not null references public.quotes (id) on delete cascade,
  status application_status not null default 'draft',
  -- Responsible-lending & disclosure checkpoints. Each key flips to a
  -- timestamp + actor when completed. TODO(compliance): wire to real
  -- identity/income verification and disclosure-document providers.
  checks jsonb not null default '{"identity_verified": null, "income_verified": null, "visa_verified": null, "not_unsuitable_assessment": null, "disclosure_document_sent": null}',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_lead_idx on public.applications (lead_id);

-- ---------------------------------------------------------------------------
-- Audit log (every staff mutation: who / what / when)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text not null default '',
  detail jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger pricing_config_updated_at before update on public.pricing_config
  for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- Every lead status change writes a timeline activity automatically,
-- so Kanban drags are captured even if the client forgets.
create function public.log_lead_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.activities (lead_id, type, body, staff_id)
    values (
      new.id,
      'status_change',
      old.status::text || ' -> ' || new.status::text,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger leads_status_change after update on public.leads
  for each row execute function public.log_lead_status_change();

-- Generic audit trigger.
create function public.log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_log (actor_id, action, entity, entity_id, detail)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(row_data ->> 'id', row_data ->> 'key', ''),
    row_data
  );
  return coalesce(new, old);
end;
$$;

create trigger leads_audit after insert or update or delete on public.leads
  for each row execute function public.log_audit();
create trigger quotes_audit after insert or update or delete on public.quotes
  for each row execute function public.log_audit();
create trigger vehicles_audit after insert or update or delete on public.vehicles
  for each row execute function public.log_audit();
create trigger pricing_config_audit after update on public.pricing_config
  for each row execute function public.log_audit();
create trigger settings_audit after insert or update or delete on public.settings
  for each row execute function public.log_audit();
create trigger applications_audit after insert or update or delete on public.applications
  for each row execute function public.log_audit();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.pricing_config enable row level security;
alter table public.settings enable row level security;
alter table public.leads enable row level security;
alter table public.quotes enable row level security;
alter table public.activities enable row level security;
alter table public.applications enable row level security;
alter table public.audit_log enable row level security;

-- profiles: staff can see the staff list (for owner assignment);
-- admins manage everyone. Role/active changes are admin-only.
create policy "staff read profiles" on public.profiles
  for select using (public.is_staff());
create policy "admin manage profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- vehicles: anyone reads active vehicles; staff read all; admins write.
create policy "public read active vehicles" on public.vehicles
  for select using (active or public.is_staff());
create policy "admin write vehicles" on public.vehicles
  for insert with check (public.is_admin());
create policy "admin update vehicles" on public.vehicles
  for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete vehicles" on public.vehicles
  for delete using (public.is_admin());

-- pricing_config: world-readable (feeds the public quote tool), admin-writable.
create policy "public read pricing" on public.pricing_config
  for select using (true);
create policy "admin update pricing" on public.pricing_config
  for update using (public.is_admin()) with check (public.is_admin());
create policy "admin insert pricing" on public.pricing_config
  for insert with check (public.is_admin());

-- settings: public keys world-readable, staff read all, admin writes.
create policy "public read public settings" on public.settings
  for select using (is_public or public.is_staff());
create policy "admin write settings" on public.settings
  for insert with check (public.is_admin());
create policy "admin update settings" on public.settings
  for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete settings" on public.settings
  for delete using (public.is_admin());

-- leads: the website may INSERT a fresh lead (never read anything back);
-- staff work the pipeline; only admins delete.
create policy "public insert new lead" on public.leads
  for insert to anon, authenticated
  with check (status = 'new' and owner_id is null);
create policy "staff read leads" on public.leads
  for select using (public.is_staff());
create policy "staff update leads" on public.leads
  for update using (public.is_staff()) with check (public.is_staff());
create policy "admin delete leads" on public.leads
  for delete using (public.is_admin());

-- quotes: website inserts the quote generated alongside the lead; staff manage.
create policy "public insert sent quote" on public.quotes
  for insert to anon, authenticated
  with check (status = 'sent');
create policy "staff read quotes" on public.quotes
  for select using (public.is_staff());
create policy "staff update quotes" on public.quotes
  for update using (public.is_staff()) with check (public.is_staff());
create policy "admin delete quotes" on public.quotes
  for delete using (public.is_admin());

-- activities: staff-only timeline.
create policy "staff read activities" on public.activities
  for select using (public.is_staff());
create policy "staff insert activities" on public.activities
  for insert with check (public.is_staff());
create policy "admin delete activities" on public.activities
  for delete using (public.is_admin());

-- applications: staff-only (the public application flow goes through a
-- controlled server path; see spec §4.3).
create policy "staff read applications" on public.applications
  for select using (public.is_staff());
create policy "staff write applications" on public.applications
  for insert with check (public.is_staff());
create policy "staff update applications" on public.applications
  for update using (public.is_staff()) with check (public.is_staff());
create policy "admin delete applications" on public.applications
  for delete using (public.is_admin());

-- audit_log: staff read, nobody writes directly (security-definer trigger only).
create policy "staff read audit log" on public.audit_log
  for select using (public.is_staff());
