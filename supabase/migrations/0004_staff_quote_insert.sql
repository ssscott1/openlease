-- Staff can create quotes directly (duplicate, manual quote from the CRM),
-- in any status. The public path stays limited to status='sent'.
create policy "staff insert quotes" on public.quotes
  for insert with check (public.is_staff());
