-- Migrare 28: ștergere dosar robustă (FK istoric) + CASCADE garantat
-- Eroarea tipică din app: update or delete on table "dosare" violates foreign key...
-- Rulează în Supabase: Project -> SQL Editor -> New query -> Run

-- Asigură CASCADE pe istoric (CREATE TABLE IF NOT EXISTS din migrarea 6
-- nu actualizează FK-ul dacă tabela exista deja fără cascade).
do $$
declare
  c_name text;
begin
  select tc.constraint_name into c_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'istoric_dosar'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'dosar_id'
  limit 1;

  if c_name is not null then
    execute format('alter table public.istoric_dosar drop constraint %I', c_name);
  end if;

  alter table public.istoric_dosar
    add constraint istoric_dosar_dosar_id_fkey
    foreign key (dosar_id) references public.dosare(id) on delete cascade;
exception
  when duplicate_object then
    null;
end $$;

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

  if v_row.created_by is distinct from v_uid and not public.is_admin() then
    raise exception 'Poți șterge doar dosarele create de tine.';
  end if;

  insert into public.dosare_arhiva (id, payload, arhivat_de, arhivat_de_email)
  values (v_row.id, to_jsonb(v_row), v_uid, v_email)
  on conflict (id) do update
    set payload = excluded.payload,
        arhivat_at = now(),
        arhivat_de = excluded.arhivat_de,
        arhivat_de_email = excluded.arhivat_de_email;

  -- Șterge explicit copiii (defensiv, pe lângă CASCADE)
  delete from public.istoric_dosar where dosar_id = p_dosar_id;
  delete from public.dosare where id = p_dosar_id;
end;
$$;

revoke all on function public.delete_dosar_with_archive(uuid) from public;
grant execute on function public.delete_dosar_with_archive(uuid) to authenticated;
