-- Migrare 20: white-label branding (single workshop)
-- Nume atelier, inițiale, logo public, culoare accent

alter table public.setari
  add column if not exists atelier_nume text default 'Dosare Daună',
  add column if not exists atelier_short text default 'WD',
  add column if not exists logo_url text,
  add column if not exists accent_color text default '#C98A2B';

update public.setari
set
  atelier_nume = coalesce(nullif(trim(atelier_nume), ''), 'Dosare Daună'),
  atelier_short = coalesce(nullif(trim(atelier_short), ''), 'WD'),
  accent_color = coalesce(nullif(trim(accent_color), ''), '#C98A2B')
where id = 1;

-- View autentificat (fără admin_emails) + câmpuri branding
create or replace view public.setari_publice as
select
  id,
  capacitate_zilnica,
  prag_ridicare_zile,
  prag_inactivitate_zile,
  utilizatori,
  asiguratori,
  atelier_nume,
  atelier_short,
  logo_url,
  accent_color
from public.setari;

grant select on public.setari_publice to authenticated;

-- Branding public pe ecranul de login (fără utilizatori / asiguratori)
create or replace view public.atelier_branding as
select
  id,
  atelier_nume,
  atelier_short,
  logo_url,
  accent_color
from public.setari
where id = 1;

grant select on public.atelier_branding to anon, authenticated;

-- Bucket public pentru logo atelier
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;

drop policy if exists "public read branding" on storage.objects;
create policy "public read branding"
  on storage.objects for select
  using (bucket_id = 'branding');

drop policy if exists "authenticated upload branding" on storage.objects;
create policy "authenticated upload branding"
  on storage.objects for insert
  with check (bucket_id = 'branding' and auth.role() = 'authenticated');

drop policy if exists "authenticated update branding" on storage.objects;
create policy "authenticated update branding"
  on storage.objects for update
  using (bucket_id = 'branding' and auth.role() = 'authenticated');

drop policy if exists "authenticated delete branding" on storage.objects;
create policy "authenticated delete branding"
  on storage.objects for delete
  using (bucket_id = 'branding' and auth.role() = 'authenticated');
