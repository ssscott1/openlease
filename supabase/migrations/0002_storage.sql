-- Vehicle image storage: public read, staff write.
insert into storage.buckets (id, name, public)
values ('vehicles', 'vehicles', true)
on conflict (id) do nothing;

create policy "public read vehicle images" on storage.objects
  for select using (bucket_id = 'vehicles');

create policy "staff upload vehicle images" on storage.objects
  for insert with check (bucket_id = 'vehicles' and public.is_staff());

create policy "staff update vehicle images" on storage.objects
  for update using (bucket_id = 'vehicles' and public.is_staff())
  with check (bucket_id = 'vehicles' and public.is_staff());

create policy "staff delete vehicle images" on storage.objects
  for delete using (bucket_id = 'vehicles' and public.is_staff());
