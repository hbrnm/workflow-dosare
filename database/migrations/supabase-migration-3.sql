-- Migrare 3: conturi individuale pentru colegi (Supabase Auth)
-- Rulează în Supabase -> SQL Editor -> New query -> Run

-- coloane pentru urmărirea cine a creat/modificat un dosar
alter table dosare add column if not exists created_by_email text;
alter table dosare add column if not exists updated_by_email text;

-- elimină politica veche, prea permisivă (accesibilă cu cheia anon, fără login)
drop policy if exists "allow all for anon (temporar)" on dosare;

-- de-acum, doar utilizatorii autentificați (conturile colegilor) pot citi/scrie
-- toți colegii logați văd și pot edita toate dosarele (colaborare pe aceeași bază)
create policy "authenticated select" on dosare
  for select using (auth.role() = 'authenticated');

create policy "authenticated insert" on dosare
  for insert with check (auth.role() = 'authenticated');

create policy "authenticated update" on dosare
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated delete" on dosare
  for delete using (auth.role() = 'authenticated');
