-- Migration 38: tarife manoperă atelier (salariu → cost orar pe dosar)
begin;

alter table public.ateliere
  add column if not exists manopera_tarife jsonb not null default '{
    "tinichigerie": {"salariuLunar": 0, "oreProductiveLuna": 160, "overheadProc": 20, "tarifOrar": null},
    "vopsitorie": {"salariuLunar": 0, "oreProductiveLuna": 160, "overheadProc": 20, "tarifOrar": null},
    "autoCalcFromOre": true
  }'::jsonb;

create or replace function public.update_atelier_settings(p_atelier_id uuid, p_patch jsonb)
returns public.ateliere
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.ateliere%rowtype;
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
  v_ok boolean := false;
begin
  if v_uid is null then
    raise exception 'Neautentificat';
  end if;
  if p_atelier_id is null then
    raise exception 'Atelier lipsă.';
  end if;

  if not public.is_atelier_member(p_atelier_id) then
    raise exception 'Nu ești membru al acestui atelier.';
  end if;

  v_ok := public.ensure_atelier_admin(p_atelier_id);
  if not v_ok then
    raise exception 'Doar administratorul atelierului poate modifica setările.';
  end if;

  update public.ateliere a
  set
    nume = case when v_patch ? 'nume' then coalesce(nullif(trim(v_patch->>'nume'), ''), a.nume) else a.nume end,
    short = case when v_patch ? 'short' then coalesce(nullif(trim(v_patch->>'short'), ''), a.short) else a.short end,
    logo_url = case when v_patch ? 'logo_url' then nullif(v_patch->>'logo_url', '') else a.logo_url end,
    capacitate_zilnica = case when v_patch ? 'capacitate_zilnica' then greatest(1, (v_patch->>'capacitate_zilnica')::int) else a.capacitate_zilnica end,
    prag_ridicare_zile = case when v_patch ? 'prag_ridicare_zile' then greatest(1, (v_patch->>'prag_ridicare_zile')::int) else a.prag_ridicare_zile end,
    prag_inactivitate_zile = case when v_patch ? 'prag_inactivitate_zile' then greatest(1, (v_patch->>'prag_inactivitate_zile')::int) else a.prag_inactivitate_zile end,
    asiguratori = case when v_patch ? 'asiguratori' then coalesce(v_patch->'asiguratori', a.asiguratori) else a.asiguratori end,
    termene_alerta_status = case when v_patch ? 'termene_alerta_status' then coalesce(v_patch->'termene_alerta_status', a.termene_alerta_status) else a.termene_alerta_status end,
    manopera_tarife = case when v_patch ? 'manopera_tarife' then coalesce(v_patch->'manopera_tarife', a.manopera_tarife) else a.manopera_tarife end,
    plan = case when v_patch ? 'plan' then coalesce(nullif(v_patch->>'plan', ''), a.plan) else a.plan end,
    trial_ends_at = case
      when v_patch ? 'trial_ends_at' and nullif(v_patch->>'trial_ends_at', '') is null then null
      when v_patch ? 'trial_ends_at' then (v_patch->>'trial_ends_at')::timestamptz
      else a.trial_ends_at
    end,
    seat_limit = case when v_patch ? 'seat_limit' then greatest(1, (v_patch->>'seat_limit')::int) else a.seat_limit end
  where a.id = p_atelier_id
  returning * into v_row;

  if not found then
    raise exception 'Atelier inexistent.';
  end if;

  if v_row.slug = 'default' then
    update public.setari s
    set
      atelier_nume = v_row.nume,
      atelier_short = v_row.short,
      logo_url = v_row.logo_url,
      capacitate_zilnica = v_row.capacitate_zilnica,
      prag_ridicare_zile = v_row.prag_ridicare_zile,
      prag_inactivitate_zile = v_row.prag_inactivitate_zile,
      asiguratori = v_row.asiguratori,
      termene_alerta_status = v_row.termene_alerta_status,
      plan = v_row.plan,
      trial_ends_at = v_row.trial_ends_at,
      seat_limit = v_row.seat_limit
    where s.id = 1;
  end if;

  return v_row;
end;
$$;

revoke all on function public.update_atelier_settings(uuid, jsonb) from public;
grant execute on function public.update_atelier_settings(uuid, jsonb) to authenticated;

commit;
