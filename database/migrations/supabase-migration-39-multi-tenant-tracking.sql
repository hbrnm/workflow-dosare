-- Migrare 39: Tracking public cu branding corect per-tenant (atelier_id)
-- Rulează în Supabase SQL Editor.
--
-- Ce face:
--   * Actualizează RPC-ul public get_public_tracking(p_token text)
--   * Preia numele, prescurtarea și logo-ul din public.ateliere conform atelier_id din dosar
--   * Fallback la atelierul default sau setari id=1 dacă atelier_id este absent

begin;

create or replace function public.get_public_tracking(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.dosare%rowtype;
  v_atelier record;
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return null;
  end if;

  select * into r
  from public.dosare
  where tracking_token = trim(p_token)
  limit 1;

  if not found then
    return null;
  end if;

  -- Preia branding-ul atelierului de care aparține dosarul
  if r.atelier_id is not null then
    select nume, short, logo_url
    into v_atelier
    from public.ateliere
    where id = r.atelier_id
    limit 1;
  end if;

  -- Fallback la setari id=1 dacă nu s-a găsit atelierul
  if v_atelier.nume is null then
    select atelier_nume as nume, atelier_short as short, logo_url
    into v_atelier
    from public.setari
    where id = 1
    limit 1;
  end if;

  return jsonb_build_object(
    'status', r.status,
    'numar_inmatriculare', r.numar_inmatriculare,
    'marca', coalesce(nullif(r.marca, ''), split_part(coalesce(r.marca_model, ''), ' ', 1)),
    'model', coalesce(nullif(r.model, ''), ''),
    'tip_asigurare', r.tip_asigurare,
    'data_deschiderii', r.data_deschiderii,
    'data_schimbare_status', r.data_schimbare_status,
    'gata_de_ridicare', coalesce(r.gata_de_ridicare, false),
    'data_gata_ridicare', r.data_gata_ridicare,
    'ridicata', coalesce(r.ridicata, false),
    'data_ridicare', r.data_ridicare,
    'piese_sosite', coalesce(r.piese_sosite, false),
    'mesaj_client', coalesce(r.mesaj_client, ''),
    'atelier', jsonb_build_object(
      'nume', coalesce(v_atelier.nume, 'Service auto'),
      'short', coalesce(v_atelier.short, 'SA'),
      'logo_url', v_atelier.logo_url
    )
  );
end;
$$;

revoke all on function public.get_public_tracking(text) from public;
grant execute on function public.get_public_tracking(text) to anon, authenticated;

commit;
