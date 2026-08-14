-- Migrare 32: RLS fail-closed pe tenant (atelier)
-- Rulează în Supabase SQL Editor DUPĂ migrările 29–31 + backup.
--
-- Ce face:
--   * backfill dosare / dosare_arhiva fără atelier_id → atelier default
--   * SELECT/INSERT/UPDATE/DELETE pe dosare doar pentru membrii atelierului
--   * istoric_dosar citibil doar dacă poți vedea dosarul
--   * dosare_arhiva pe membership (admin atelier)
--   * delete_dosar_with_archive: membru + (owner | admin atelier); scrie atelier_id în arhivă
--   * storage poze/documente: read/write doar dacă ești membru pe dosarul din path
--   * NOT NULL pe dosare.atelier_id (după backfill)

begin;

-- ── 1. Backfill orphan ─────────────────────────────────────
update public.dosare d
set atelier_id = a.id
from public.ateliere a
where d.atelier_id is null
  and a.slug = 'default';

-- dacă nu există slug default, folosește primul atelier
update public.dosare d
set atelier_id = (select id from public.ateliere order by created_at nulls last, id limit 1)
where d.atelier_id is null
  and exists (select 1 from public.ateliere);

update public.dosare_arhiva x
set atelier_id = coalesce(
  x.atelier_id,
  (x.payload ->> 'atelier_id')::uuid,
  (select id from public.ateliere where slug = 'default' limit 1),
  (select id from public.ateliere order by created_at nulls last, id limit 1)
)
where x.atelier_id is null;

-- ── 2. Helper staff pe atelier ─────────────────────────────
create or replace function public.is_atelier_staff(p_atelier_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.atelier_membri m
    where m.atelier_id = p_atelier_id
      and m.user_id = auth.uid()
      and m.role in ('admin', 'receptioner', 'operator', 'mecanic')
  );
$$;

revoke all on function public.is_atelier_staff(uuid) from public;
grant execute on function public.is_atelier_staff(uuid) to authenticated;

-- Storage: path = <dosar-id>/...
create or replace function public.can_access_dosar_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dosare d
    where d.id::text = split_part(object_name, '/', 1)
      and d.atelier_id is not null
      and public.is_atelier_member(d.atelier_id)
  );
$$;

revoke all on function public.can_access_dosar_storage_object(text) from public;
grant execute on function public.can_access_dosar_storage_object(text) to authenticated;

-- ── 3. RLS dosare: fail-closed ─────────────────────────────
drop policy if exists "dosare_select_authenticated" on public.dosare;
drop policy if exists "dosare_select_atelier_member" on public.dosare;
create policy "dosare_select_atelier_member"
on public.dosare
for select
to authenticated
using (
  atelier_id is not null
  and public.is_atelier_member(atelier_id)
);

drop policy if exists "dosare_insert_own" on public.dosare;
create policy "dosare_insert_own"
on public.dosare
for insert
to authenticated
with check (
  created_by = auth.uid()
  and atelier_id is not null
  and public.is_atelier_member(atelier_id)
);

drop policy if exists "dosare_update_own" on public.dosare;
drop policy if exists "dosare_update_own_or_admin" on public.dosare;
drop policy if exists "dosare_update_staff" on public.dosare;
create policy "dosare_update_atelier_staff"
on public.dosare
for update
to authenticated
using (
  atelier_id is not null
  and public.is_atelier_member(atelier_id)
  and (created_by = auth.uid() or public.is_atelier_staff(atelier_id))
)
with check (
  atelier_id is not null
  and public.is_atelier_member(atelier_id)
  and (created_by = auth.uid() or public.is_atelier_staff(atelier_id))
);

drop policy if exists "dosare_delete_own" on public.dosare;
drop policy if exists "dosare_delete_own_or_admin" on public.dosare;
create policy "dosare_delete_atelier_owner_or_admin"
on public.dosare
for delete
to authenticated
using (
  atelier_id is not null
  and public.is_atelier_member(atelier_id)
  and (created_by = auth.uid() or public.is_atelier_admin(atelier_id))
);

-- ── 4. istoric_dosar ───────────────────────────────────────
drop policy if exists "authenticated read istoric" on public.istoric_dosar;
drop policy if exists "istoric_select_atelier_member" on public.istoric_dosar;
create policy "istoric_select_atelier_member"
on public.istoric_dosar
for select
to authenticated
using (
  exists (
    select 1
    from public.dosare d
    where d.id = dosar_id
      and d.atelier_id is not null
      and public.is_atelier_member(d.atelier_id)
  )
);

-- ── 5. dosare_arhiva ───────────────────────────────────────
drop policy if exists "admins_read_dosare_arhiva" on public.dosare_arhiva;
drop policy if exists "arhiva_select_atelier_admin" on public.dosare_arhiva;
create policy "arhiva_select_atelier_admin"
on public.dosare_arhiva
for select
to authenticated
using (
  atelier_id is not null
  and public.is_atelier_admin(atelier_id)
);

-- ── 6. RPC delete + archive ────────────────────────────────
create or replace function public.delete_dosar_with_archive(p_dosar_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dosare%rowtype;
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Neautentificat';
  end if;

  select * into v_row from public.dosare where id = p_dosar_id for update;
  if not found then
    return;
  end if;

  if v_row.atelier_id is null or not public.is_atelier_member(v_row.atelier_id) then
    raise exception 'Nu ai acces la acest dosar.';
  end if;

  if v_row.created_by is distinct from v_uid
     and not public.is_atelier_admin(v_row.atelier_id) then
    raise exception 'Poți șterge doar dosarele create de tine.';
  end if;

  insert into public.dosare_arhiva (id, payload, arhivat_de, arhivat_de_email, atelier_id)
  values (v_row.id, to_jsonb(v_row), v_uid, v_email, v_row.atelier_id)
  on conflict (id) do update
    set payload = excluded.payload,
        arhivat_at = now(),
        arhivat_de = excluded.arhivat_de,
        arhivat_de_email = excluded.arhivat_de_email,
        atelier_id = excluded.atelier_id;

  delete from public.istoric_dosar where dosar_id = p_dosar_id;
  delete from public.dosare where id = p_dosar_id;
end;
$$;

revoke all on function public.delete_dosar_with_archive(uuid) from public;
grant execute on function public.delete_dosar_with_archive(uuid) to authenticated;

-- ── 7. Storage izolat pe membership dosar ──────────────────
drop policy if exists "poze_read_authenticated" on storage.objects;
drop policy if exists "poze_select_atelier_member" on storage.objects;
create policy "poze_select_atelier_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'poze-dosare'
  and public.can_access_dosar_storage_object(name)
);

drop policy if exists "documente_read_authenticated" on storage.objects;
drop policy if exists "documente_select_atelier_member" on storage.objects;
create policy "documente_select_atelier_member"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documente-dosare'
  and public.can_access_dosar_storage_object(name)
);

drop policy if exists "poze_insert_owner" on storage.objects;
drop policy if exists "poze_insert_owner_or_admin" on storage.objects;
drop policy if exists "poze_insert_staff" on storage.objects;
create policy "poze_insert_atelier_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'poze-dosare'
  and public.can_access_dosar_storage_object(name)
);

drop policy if exists "documente_insert_owner" on storage.objects;
drop policy if exists "documente_insert_owner_or_admin" on storage.objects;
drop policy if exists "documente_insert_staff" on storage.objects;
create policy "documente_insert_atelier_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documente-dosare'
  and public.can_access_dosar_storage_object(name)
);

drop policy if exists "poze_delete_owner" on storage.objects;
drop policy if exists "poze_delete_owner_or_admin" on storage.objects;
drop policy if exists "poze_delete_staff" on storage.objects;
create policy "poze_delete_atelier_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'poze-dosare'
  and public.can_access_dosar_storage_object(name)
  and (
    public.owns_dosar_storage_object(name)
    or exists (
      select 1
      from public.dosare d
      join public.atelier_membri m
        on m.atelier_id = d.atelier_id
       and m.user_id = auth.uid()
      where d.id::text = split_part(name, '/', 1)
        and m.role in ('admin', 'receptioner', 'operator')
    )
  )
);

drop policy if exists "documente_delete_owner" on storage.objects;
drop policy if exists "documente_delete_owner_or_admin" on storage.objects;
drop policy if exists "documente_delete_staff" on storage.objects;
create policy "documente_delete_atelier_member"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documente-dosare'
  and public.can_access_dosar_storage_object(name)
  and (
    public.owns_dosar_storage_object(name)
    or exists (
      select 1
      from public.dosare d
      join public.atelier_membri m
        on m.atelier_id = d.atelier_id
       and m.user_id = auth.uid()
      where d.id::text = split_part(name, '/', 1)
        and m.role in ('admin', 'receptioner', 'operator')
    )
  )
);

-- ── 8. NOT NULL după backfill ───────────────────────────────
do $$
begin
  if exists (select 1 from public.dosare where atelier_id is null) then
    raise exception 'Migrare 32: mai există dosare fără atelier_id — backfill eșuat.';
  end if;
end;
$$;

alter table public.dosare alter column atelier_id set not null;

commit;
