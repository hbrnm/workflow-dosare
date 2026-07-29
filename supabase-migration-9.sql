-- Migrare 9: securizare strictă pe proprietarul dosarului
-- Rulează o singură dată în Supabase: SQL Editor -> New query -> Run
--
-- Rezultat:
--   * toți colegii autentificați pot vedea dosarele;
--   * numai creatorul poate modifica sau șterge un dosar;
--   * un dosar nou poate fi creat numai pentru contul curent;
--   * numai proprietarul poate încărca sau șterge fișierele interne.
--
-- Dosarele vechi fără created_by rămân vizibile, dar nu pot fi editate până
-- când un administrator le atribuie explicit unui cont (vezi interogarea de
-- la final). Aceasta este intenționat: nu mai acordăm acces de editare tuturor.

begin;

alter table public.dosare
  add column if not exists created_by uuid references auth.users(id);

alter table public.dosare
  alter column created_by set default auth.uid();

create index if not exists idx_dosare_created_by
  on public.dosare (created_by);

-- Atribuie automat dosarele vechi atunci când emailul istoric corespunde
-- unui cont Supabase existent.
update public.dosare d
set created_by = u.id
from auth.users u
where d.created_by is null
  and d.created_by_email is not null
  and lower(d.created_by_email) = lower(u.email);

alter table public.dosare enable row level security;

-- Înlătură toate politicile folosite de versiunile anterioare ale aplicației.
drop policy if exists "allow all for anon (temporar)" on public.dosare;
drop policy if exists "authenticated select" on public.dosare;
drop policy if exists "authenticated insert" on public.dosare;
drop policy if exists "authenticated update" on public.dosare;
drop policy if exists "authenticated delete" on public.dosare;
drop policy if exists "owner update" on public.dosare;
drop policy if exists "owner delete" on public.dosare;

create policy "dosare_select_authenticated"
on public.dosare
for select
to authenticated
using (true);

create policy "dosare_insert_own"
on public.dosare
for insert
to authenticated
with check (created_by = auth.uid());

create policy "dosare_update_own"
on public.dosare
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "dosare_delete_own"
on public.dosare
for delete
to authenticated
using (created_by = auth.uid());

-- Verifică proprietarul dosarului folosind primul segment al căii Storage:
-- <dosar-id>/<fisier> sau <dosar-id>/documente/<fisier>.
create or replace function public.owns_dosar_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dosare
    where id::text = split_part(object_name, '/', 1)
      and created_by = auth.uid()
  );
$$;

revoke all on function public.owns_dosar_storage_object(text) from public;
grant execute on function public.owns_dosar_storage_object(text) to authenticated;

-- Toți colegii autentificați pot vedea fișierele dosarelor pe care le pot
-- deschide; doar proprietarul poate încărca sau șterge fișiere.
drop policy if exists "authenticated read poze" on storage.objects;
drop policy if exists "authenticated upload poze" on storage.objects;
drop policy if exists "authenticated delete poze" on storage.objects;
drop policy if exists "authenticated read documente" on storage.objects;
drop policy if exists "authenticated upload documente" on storage.objects;
drop policy if exists "authenticated delete documente" on storage.objects;

create policy "poze_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'poze-dosare');

create policy "poze_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'poze-dosare'
  and public.owns_dosar_storage_object(name)
);

create policy "poze_delete_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'poze-dosare'
  and public.owns_dosar_storage_object(name)
);

create policy "documente_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'documente-dosare');

create policy "documente_insert_owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documente-dosare'
  and public.owns_dosar_storage_object(name)
);

create policy "documente_delete_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documente-dosare'
  and public.owns_dosar_storage_object(name)
);

commit;

-- Verifică dosarele istorice care nu au putut fi atribuite automat:
-- select id, numar_dosar, client, created_by_email
-- from public.dosare
-- where created_by is null
-- order by created_at;
