-- Migrare 7: poze reale per dosar (Supabase Storage)
-- Rulează în Supabase -> SQL Editor -> New query -> Run

-- coloană nouă pentru lista de poze (separată de "documente", care rămân linkuri)
alter table dosare add column if not exists poze jsonb default '[]';

-- bucket-ul de stocare pentru poze (privat — doar echipa logată are acces)
insert into storage.buckets (id, name, public)
values ('poze-dosare', 'poze-dosare', false)
on conflict (id) do nothing;

-- doar utilizatorii autentificați pot încărca/vedea/șterge poze
create policy "authenticated read poze" on storage.objects
  for select using (bucket_id = 'poze-dosare' and auth.role() = 'authenticated');

create policy "authenticated upload poze" on storage.objects
  for insert with check (bucket_id = 'poze-dosare' and auth.role() = 'authenticated');

create policy "authenticated delete poze" on storage.objects
  for delete using (bucket_id = 'poze-dosare' and auth.role() = 'authenticated');
