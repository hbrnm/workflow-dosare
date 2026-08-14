-- Migrare 23: Workflow Daune 2.0 MVP
-- Câmpuri recepție (km, marcă/model separate), diagramă avarii, date inspector,
-- tipuri documente oficiale, roluri receptioner / mecanic / admin.
-- Rulează în Supabase → SQL Editor → New query → Run

begin;

-- --- Coloane noi pe dosare ---
alter table public.dosare
  add column if not exists kilometraj integer,
  add column if not exists marca text default '',
  add column if not exists model text default '',
  add column if not exists damage_marks jsonb default '[]'::jsonb,
  add column if not exists nr_dosar_asigurator text default '',
  add column if not exists inspector_dauna text default '',
  add column if not exists tip_documente jsonb default '[]'::jsonb;

comment on column public.dosare.kilometraj is 'Kilometraj la recepție';
comment on column public.dosare.marca is 'Marcă vehicul (separat de model)';
comment on column public.dosare.model is 'Model vehicul';
comment on column public.dosare.damage_marks is 'Marcaje avarii pe diagrama vehicul [{id,partId,severity,x,y,note,createdAt}]';
comment on column public.dosare.nr_dosar_asigurator is 'Număr dosar daună la asigurător';
comment on column public.dosare.inspector_dauna is 'Nume inspector de daună';
comment on column public.dosare.tip_documente is 'Documente oficiale tipizate [{id,tip,path,nume,...}]';

-- Backfill marcă/model din marca_model (primul cuvânt = marcă, restul = model)
update public.dosare
set
  marca = coalesce(nullif(marca, ''), split_part(trim(coalesce(marca_model, '')), ' ', 1)),
  model = coalesce(
    nullif(model, ''),
    nullif(trim(substring(trim(coalesce(marca_model, '')) from length(split_part(trim(coalesce(marca_model, '')), ' ', 1)) + 1)), ''),
    ''
  )
where coalesce(marca_model, '') <> ''
  and coalesce(marca, '') = '';

-- --- Roluri staff: receptioner / mecanic / admin (+ operator legacy) ---
create or replace function public.user_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select elem ->> 'role'
      from public.setari s,
           jsonb_array_elements(coalesce(s.utilizatori, '[]'::jsonb)) as elem
      where s.id = 1
        and lower(elem ->> 'email') = lower(auth.jwt() ->> 'email')
      limit 1
    ),
    case when public.is_admin() then 'admin' else null end
  );
$$;

revoke all on function public.user_app_role() from public;
grant execute on function public.user_app_role() to authenticated;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or public.user_app_role() in ('admin', 'receptioner', 'mecanic', 'operator');
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- Staff (inclusiv mecanici) pot actualiza dosare; ștergere rămâne owner/admin
drop policy if exists "dosare_update_own_or_admin" on public.dosare;
drop policy if exists "dosare_update_staff" on public.dosare;

create policy "dosare_update_staff"
on public.dosare
for update
to authenticated
using (created_by = auth.uid() or public.is_staff())
with check (created_by = auth.uid() or public.is_staff());

-- Storage: staff poate încărca pe orice dosar
drop policy if exists "poze_insert_owner_or_admin" on storage.objects;
drop policy if exists "poze_insert_staff" on storage.objects;
create policy "poze_insert_staff"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'poze-dosare'
  and (public.owns_dosar_storage_object(name) or public.is_staff())
);

drop policy if exists "poze_delete_owner_or_admin" on storage.objects;
drop policy if exists "poze_delete_staff" on storage.objects;
create policy "poze_delete_staff"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'poze-dosare'
  and (public.owns_dosar_storage_object(name) or public.is_admin() or public.user_app_role() in ('receptioner', 'operator'))
);

drop policy if exists "documente_insert_owner_or_admin" on storage.objects;
drop policy if exists "documente_insert_staff" on storage.objects;
create policy "documente_insert_staff"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documente-dosare'
  and (public.owns_dosar_storage_object(name) or public.is_staff())
);

drop policy if exists "documente_delete_owner_or_admin" on storage.objects;
drop policy if exists "documente_delete_staff" on storage.objects;
create policy "documente_delete_staff"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documente-dosare'
  and (public.owns_dosar_storage_object(name) or public.is_admin() or public.user_app_role() in ('receptioner', 'operator'))
);

commit;
