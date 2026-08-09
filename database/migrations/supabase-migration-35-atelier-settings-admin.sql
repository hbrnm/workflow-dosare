-- Migrare 35: salvare setări atelier fiabilă + vindecare rol admin
-- Rulează DUPĂ migrarea 34.
--
-- Ce face:
--   * promovează admin pe atelierul default din setari.admin_emails
--   * promovează singurul membru al unui atelier la admin (solo atelier)
--   * RPC update_atelier_settings — update garantat cu check is_atelier_admin

begin;

-- ── 1. Heal: admin_emails → role admin pe default ──────────
update public.atelier_membri m
set role = 'admin'
from public.setari s
join public.ateliere a on a.slug = 'default'
where s.id = 1
  and m.atelier_id = a.id
  and m.role is distinct from 'admin'
  and exists (
    select 1
    from jsonb_array_elements_text(coalesce(s.admin_emails, '[]'::jsonb)) as admin_email
    where lower(admin_email) = lower(m.email)
  );

-- Solo atelier: un singur membru → admin
update public.atelier_membri m
set role = 'admin'
where m.role is distinct from 'admin'
  and (
    select count(*)::int
    from public.atelier_membri x
    where x.atelier_id = m.atelier_id
  ) = 1;

-- ── 2. RPC update setări atelier ───────────────────────────
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
begin
  if v_uid is null then
    raise exception 'Neautentificat';
  end if;
  if p_atelier_id is null or not public.is_atelier_admin(p_atelier_id) then
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

  -- Oglindă legacy pentru slug=default
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
