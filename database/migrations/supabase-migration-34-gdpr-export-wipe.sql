-- Migrare 34: GDPR MVP — export atelier, cleanup Storage la ștergere, wipe dosare
-- Rulează DUPĂ migrarea 33.
--
-- Ce face:
--   * delete_dosar_storage_objects — șterge poze/docs din Storage pentru un dosar
--   * delete_dosar_with_archive — apelează cleanup Storage
--   * export_atelier_gdpr_bundle — JSON (atelier, membri, dosare, arhivă, istoric) doar admin
--   * wipe_atelier_dosare — șterge toate dosarele atelierului (cu confirmare slug)

begin;

-- ── 1. Cleanup Storage pe dosar ────────────────────────────
create or replace function public.delete_dosar_storage_objects(p_dosar_id uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if p_dosar_id is null then
    return;
  end if;

  delete from storage.objects
  where bucket_id in ('poze-dosare', 'documente-dosare')
    and (
      name = p_dosar_id::text
      or name like (p_dosar_id::text || '/%')
    );
exception
  when undefined_table then
    null;
  when insufficient_privilege then
    raise warning 'delete_dosar_storage_objects: fără privilegii pe storage.objects';
end;
$$;

revoke all on function public.delete_dosar_storage_objects(uuid) from public;
-- doar intern / alte RPC security definer
grant execute on function public.delete_dosar_storage_objects(uuid) to service_role;

-- ── 2. delete_dosar_with_archive + storage ─────────────────
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
  perform public.delete_dosar_storage_objects(p_dosar_id);
end;
$$;

revoke all on function public.delete_dosar_with_archive(uuid) from public;
grant execute on function public.delete_dosar_with_archive(uuid) to authenticated;

-- ── 3. Export GDPR bundle ──────────────────────────────────
create or replace function public.export_atelier_gdpr_bundle(p_atelier_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_atelier jsonb;
begin
  if v_uid is null then
    raise exception 'Neautentificat';
  end if;
  if p_atelier_id is null or not public.is_atelier_admin(p_atelier_id) then
    raise exception 'Doar administratorul atelierului poate exporta datele.';
  end if;

  select jsonb_build_object(
    'id', a.id,
    'slug', a.slug,
    'nume', a.nume,
    'short', a.short,
    'logo_url', a.logo_url,
    'capacitate_zilnica', a.capacitate_zilnica,
    'prag_ridicare_zile', a.prag_ridicare_zile,
    'prag_inactivitate_zile', a.prag_inactivitate_zile,
    'asiguratori', a.asiguratori,
    'termene_alerta_status', a.termene_alerta_status,
    'plan', a.plan,
    'trial_ends_at', a.trial_ends_at,
    'seat_limit', a.seat_limit,
    'created_at', a.created_at
  )
  into v_atelier
  from public.ateliere a
  where a.id = p_atelier_id;

  if v_atelier is null then
    raise exception 'Atelier inexistent.';
  end if;

  return jsonb_build_object(
    'schema_version', 1,
    'exported_at', now(),
    'purpose', 'gdpr_atelier_export',
    'atelier', v_atelier,
    'membri', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'email', m.email,
          'role', m.role,
          'created_at', m.created_at
        )
        order by m.email
      )
      from public.atelier_membri m
      where m.atelier_id = p_atelier_id
    ), '[]'::jsonb),
    'dosare', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.created_at nulls last)
      from public.dosare d
      where d.atelier_id = p_atelier_id
    ), '[]'::jsonb),
    'arhiva', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'arhivat_at', x.arhivat_at,
          'arhivat_de_email', x.arhivat_de_email,
          'payload', x.payload
        )
        order by x.arhivat_at nulls last
      )
      from public.dosare_arhiva x
      where x.atelier_id = p_atelier_id
    ), '[]'::jsonb),
    'istoric', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.created_at nulls last)
      from public.istoric_dosar i
      inner join public.dosare d on d.id = i.dosar_id
      where d.atelier_id = p_atelier_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.export_atelier_gdpr_bundle(uuid) from public;
grant execute on function public.export_atelier_gdpr_bundle(uuid) to authenticated;

-- ── 4. Wipe toate dosarele atelierului ─────────────────────
create or replace function public.wipe_atelier_dosare(p_atelier_id uuid, p_confirm_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_slug text;
  v_id uuid;
  v_count int := 0;
begin
  if v_uid is null then
    raise exception 'Neautentificat';
  end if;
  if p_atelier_id is null or not public.is_atelier_admin(p_atelier_id) then
    raise exception 'Doar administratorul atelierului poate șterge datele.';
  end if;

  select a.slug into v_slug from public.ateliere a where a.id = p_atelier_id;
  if v_slug is null then
    raise exception 'Atelier inexistent.';
  end if;
  if lower(trim(coalesce(p_confirm_slug, ''))) is distinct from lower(v_slug) then
    raise exception 'Confirmarea slug este incorectă. Tastează exact: %', v_slug;
  end if;

  for v_id in
    select d.id from public.dosare d where d.atelier_id = p_atelier_id
  loop
    perform public.delete_dosar_with_archive(v_id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'atelier_id', p_atelier_id,
    'slug', v_slug,
    'dosare_sterse', v_count,
    'wiped_at', now()
  );
end;
$$;

revoke all on function public.wipe_atelier_dosare(uuid, text) from public;
grant execute on function public.wipe_atelier_dosare(uuid, text) to authenticated;

commit;
