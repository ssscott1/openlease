-- Hardening from Supabase security advisors.

-- Pin search_path on the updated_at trigger function.
alter function public.set_updated_at() set search_path = public;

-- Trigger functions never need direct RPC execution by API roles.
-- (is_staff/is_admin must remain executable — RLS policies evaluate them
-- as the querying role.)
revoke execute on function public.log_audit() from public, anon, authenticated;
revoke execute on function public.log_lead_status_change() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- The vehicles bucket is public (object URLs work without a policy);
-- only staff need to LIST objects. Drop the broad select policy.
drop policy if exists "public read vehicle images" on storage.objects;
create policy "staff list vehicle images" on storage.objects
  for select using (bucket_id = 'vehicles' and public.is_staff());
