-- Migrare 27: Tracking client polish — mesaj opțional + RPC actualizat
-- Rulează în Supabase → SQL Editor

begin;

alter table public.dosare
  add column if not exists mesaj_client text default '';

comment on column public.dosare.mesaj_client is 'Mesaj scurt vizibil pe linkul de tracking public';

create or replace function public.get_public_tracking(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.dosare%rowtype;
  result jsonb;
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

  result := jsonb_build_object(
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
    'atelier', (
      select jsonb_build_object(
        'nume', coalesce(s.atelier_nume, 'Service auto'),
        'short', coalesce(s.atelier_short, 'SA'),
        'accent', coalesce(s.accent_color, null)
      )
      from public.setari s
      where s.id = 1
    )
  );
  return result;
end;
$$;

revoke all on function public.get_public_tracking(text) from public;
grant execute on function public.get_public_tracking(text) to anon, authenticated;

commit;
