-- Migrare 8: bucket separat pentru documentele dosarului
-- Rulează acest script în Supabase -> SQL Editor -> New query -> Run

-- Bucket privat pentru documente interne ale dosarului
insert into storage.buckets (id, name, public)
values ('documente-dosare', 'documente-dosare', false)
on conflict (id) do nothing;

-- doar utilizatorii autentificați pot citi/încărca/șterge documente
create policy "authenticated read documente" on storage.objects
  for select using (bucket_id = 'documente-dosare' and auth.role() = 'authenticated');

create policy "authenticated upload documente" on storage.objects
  for insert with check (bucket_id = 'documente-dosare' and auth.role() = 'authenticated');

create policy "authenticated delete documente" on storage.objects
  for delete using (bucket_id = 'documente-dosare' and auth.role() = 'authenticated');
