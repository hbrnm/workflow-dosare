-- Migrare 13: securizare avansată RLS pentru Administratori și protecție tabela setări
-- Rulează în Supabase: Project -> SQL Editor -> New query -> Run

begin;

-- Funcție ajutor SQL pentru a verifica dacă utilizatorul curent are rol de Administrator
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.setari s
    where s.id = 1
      and (
        -- Verifică dacă emailul este în lista admin_emails
        exists (
          select 1
          from jsonb_array_elements_text(coalesce(s.admin_emails, '[]'::jsonb)) as admin_email
          where lower(admin_email) = lower(auth.jwt() ->> 'email')
        )
        or
        -- Verifică dacă utilizatorul are role = 'admin' în lista utilizatori
        exists (
          select 1
          from jsonb_array_elements(coalesce(s.utilizatori, '[]'::jsonb)) as elem
          where lower(elem ->> 'email') = lower(auth.jwt() ->> 'email')
            and elem ->> 'role' = 'admin'
        )
      )
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 1. Actualizare RLS pe tabela public.dosare (Administratorii pot edita/șterge orice dosar)
drop policy if exists "dosare_update_own" on public.dosare;
drop policy if exists "dosare_delete_own" on public.dosare;
drop policy if exists "dosare_update_own_or_admin" on public.dosare;
drop policy if exists "dosare_delete_own_or_admin" on public.dosare;

create policy "dosare_update_own_or_admin"
on public.dosare
for update
to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());

create policy "dosare_delete_own_or_admin"
on public.dosare
for delete
to authenticated
using (created_by = auth.uid() or public.is_admin());

-- 2. Securizare RLS pe tabela public.setari (Doar administratorii pot modifica setările globale)
alter table public.setari enable row level security;

drop policy if exists "authenticated write setari" on public.setari;
drop policy if exists "admin_write_setari" on public.setari;

create policy "admin_write_setari"
on public.setari
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 3. Actualizare politici Storage (Administratorii pot încărca/șterge fișiere din orice dosar)
drop policy if exists "poze_insert_owner" on storage.objects;
drop policy if exists "poze_delete_owner" on storage.objects;
drop policy if exists "documente_insert_owner" on storage.objects;
drop policy if exists "documente_delete_owner" on storage.objects;
drop policy if exists "poze_insert_owner_or_admin" on storage.objects;
drop policy if exists "poze_delete_owner_or_admin" on storage.objects;
drop policy if exists "documente_insert_owner_or_admin" on storage.objects;
drop policy if exists "documente_delete_owner_or_admin" on storage.objects;

create policy "poze_insert_owner_or_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'poze-dosare'
  and (public.owns_dosar_storage_object(name) or public.is_admin())
);

create policy "poze_delete_owner_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'poze-dosare'
  and (public.owns_dosar_storage_object(name) or public.is_admin())
);

create policy "documente_insert_owner_or_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documente-dosare'
  and (public.owns_dosar_storage_object(name) or public.is_admin())
);

create policy "documente_delete_owner_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documente-dosare'
  and (public.owns_dosar_storage_object(name) or public.is_admin())
);

commit;
