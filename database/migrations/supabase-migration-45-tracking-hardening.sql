-- Migrare 45: portal tracking public — limita de rata, fix atelier lipsa, cai poze pentru URL-uri semnate
-- Executa in Supabase SQL Editor (dupa migrarea 44).
--
--   1. tracking_rate_limit + tracking_rate_limit_ok(): max 30 apeluri/minut/IP pe get_public_tracking
--      (IP din cf-connecting-ip, apoi x-real-ip, apoi ultimul x-forwarded-for; fara IP = fara limitare).
--   2. get_public_tracking: repara eroarea "record v_atelier is not assigned yet" cand dosarul nu are atelier_id.
--   3. tracking_photo_paths(token): caile pozelor vizibile clientului; doar pentru service_role
--      (folosita de edge function-ul tracking-photos care semneaza URL-urile).

begin;

create table if not exists public.tracking_rate_limit (
  ip text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (ip, window_start)
);
alter table public.tracking_rate_limit enable row level security;
revoke all on public.tracking_rate_limit from anon, authenticated;

create or replace function public.tracking_client_ip()
returns text
language plpgsql
stable
as $$
declare
  h jsonb;
  parts text[];
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    h := null;
  end;
  if h is null then
    return 'unknown';
  end if;
  parts := string_to_array(coalesce(h->>'x-forwarded-for', ''), ',');
  return coalesce(
    nullif(trim(h->>'cf-connecting-ip'), ''),
    nullif(trim(h->>'x-real-ip'), ''),
    nullif(trim(parts[array_length(parts, 1)]), ''),
    'unknown'
  );
end;
$$;

create or replace function public.tracking_rate_limit_ok(p_limit int default 30)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ip text := public.tracking_client_ip();
  v_window timestamptz := date_trunc('minute', now());
  v_hits int;
begin
  if v_ip = 'unknown' then
    return true;
  end if;

  insert into public.tracking_rate_limit as t (ip, window_start, hits)
  values (v_ip, v_window, 1)
  on conflict (ip, window_start) do update set hits = t.hits + 1
  returning t.hits into v_hits;

  if random() < 0.02 then
    delete from public.tracking_rate_limit where window_start < now() - interval '1 hour';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.tracking_rate_limit_ok(int) from public, anon, authenticated;

create or replace function public.get_public_tracking(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  r public.dosare%rowtype;
  v_nume text;
  v_short text;
  v_logo text;
  v_poze jsonb;
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return null;
  end if;

  if not public.tracking_rate_limit_ok(30) then
    raise exception 'Prea multe incercari. Incearca din nou peste un minut.' using errcode = 'P0001';
  end if;

  select * into r
  from public.dosare
  where upper(trim(tracking_token)) = upper(trim(p_token))
     or tracking_token = trim(p_token)
  limit 1;

  if not found then
    return null;
  end if;

  if r.atelier_id is not null then
    select a.nume, a.short, a.logo_url
    into v_nume, v_short, v_logo
    from public.ateliere a
    where a.id = r.atelier_id
    limit 1;
  end if;

  if v_nume is null then
    select s.atelier_nume, s.atelier_short, s.logo_url
    into v_nume, v_short, v_logo
    from public.setari s
    where s.id = 1
    limit 1;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p->>'id',
        'path', p->>'path',
        'nume', p->>'nume',
        'categoria', p->>'categoria',
        'reper', p->>'reper',
        'reperLabel', p->>'reperLabel',
        'vizibilClient', coalesce((p->>'vizibilClient')::boolean, false),
        'url', p->>'url'
      )
    ) filter (
      where coalesce((p->>'vizibilClient')::boolean, false) is true
         or coalesce(p->>'categoria', '') = 'predare'
    ),
    '[]'::jsonb
  ) into v_poze
  from jsonb_array_elements(coalesce(r.poze, '[]'::jsonb)) as p;

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
    'poze', coalesce(v_poze, '[]'::jsonb),
    'atelier', jsonb_build_object(
      'nume', coalesce(v_nume, 'Service auto'),
      'short', coalesce(v_short, 'SA'),
      'logo_url', v_logo
    )
  );
end;
$$;

revoke all on function public.get_public_tracking(text) from public;
grant execute on function public.get_public_tracking(text) to anon, authenticated;

create or replace function public.tracking_photo_paths(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.dosare%rowtype;
  v_poze jsonb;
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return '[]'::jsonb;
  end if;

  select * into r
  from public.dosare
  where upper(trim(tracking_token)) = upper(trim(p_token))
     or tracking_token = trim(p_token)
  limit 1;

  if not found then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p->>'id',
        'path', p->>'path',
        'nume', p->>'nume',
        'categoria', p->>'categoria',
        'reper', p->>'reper',
        'reperLabel', p->>'reperLabel',
        'vizibilClient', coalesce((p->>'vizibilClient')::boolean, false)
      )
    ) filter (
      where nullif(p->>'path', '') is not null
        and (
          coalesce((p->>'vizibilClient')::boolean, false) is true
          or coalesce(p->>'categoria', '') = 'predare'
        )
    ),
    '[]'::jsonb
  ) into v_poze
  from jsonb_array_elements(coalesce(r.poze, '[]'::jsonb)) as p;

  return v_poze;
end;
$$;

revoke all on function public.tracking_photo_paths(text) from public, anon, authenticated;
grant execute on function public.tracking_photo_paths(text) to service_role;

commit;
