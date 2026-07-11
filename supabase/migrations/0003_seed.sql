-- Seed data (spec §7). All of this is CRM-editable afterwards — nothing is
-- hard-coded in the front-end.

insert into public.vehicles
  (slug, name, descriptor, image_url, base_weekly_rate, sort_order, body_type, fuel_economy, seats)
values
  ('corolla-cross-hybrid', 'Toyota Corolla Cross Hybrid', 'The efficient all-rounder', '/cars/corolla-cross-hybrid.svg', 289, 1, 'SUV', '4.4 L/100km', 5),
  ('camry-hybrid', 'Toyota Camry Hybrid', 'The comfortable commuter', '/cars/camry-hybrid.svg', 329, 2, 'Sedan', '4.0 L/100km', 5),
  ('rav4-hybrid', 'Toyota RAV4 Hybrid', 'The family all-rounder', '/cars/rav4-hybrid.svg', 339, 3, 'SUV', '4.7 L/100km', 5),
  ('hilux-sr5', 'Toyota HiLux SR5 4x4', 'The workhorse', '/cars/hilux-sr5.svg', 419, 4, 'Ute', '7.9 L/100km', 5),
  ('kluger-hybrid', 'Toyota Kluger Hybrid', 'The seven-seat premium', '/cars/kluger-hybrid.svg', 449, 5, 'SUV', '5.6 L/100km', 7)
on conflict (slug) do nothing;

insert into public.pricing_config
  (term_min_months, term_max_months, term_multipliers, included_km_per_week, excess_km_rate, included_items)
select
  9, 24,
  '{"9": 1.12, "12": 1.08, "18": 1.04, "24": 1.0}'::jsonb,
  380, 0.25,
  '["insurance", "servicing", "maintenance", "tyres", "rego", "roadside", "delivery"]'::jsonb
where not exists (select 1 from public.pricing_config);

insert into public.settings (key, value, is_public, description) values
  ('customer_login_url', 'https://www.karia.com.au', true, 'Customer Login target in the header/footer'),
  ('contact_email', 'hello@openlease.com.au', true, 'Public contact email'),
  ('contact_phone', '+61 2 8000 0000', true, 'Public contact phone'),
  ('disclaimer_text', '', true, 'Overrides the localised pricing disclaimer when set (English only)'),
  ('lead_alert_email', 'sales@openlease.com.au', false, 'Internal address for new-lead alerts'),
  ('daily_digest_enabled', 'false', false, 'Send the daily pipeline digest to sales'),
  ('feature_partner_form', 'true', true, 'Show the partner enquiry form')
on conflict (key) do nothing;
