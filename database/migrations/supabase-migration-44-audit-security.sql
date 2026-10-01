-- Migrare 44: remedieri audit securitate
-- Executa in Supabase SQL Editor.
--
--   1. Storage: elimina citirea anonima a TUTOR obiectelor din poze-dosare (migrarea 43).
--      Anon poate citi doar fisierele marcate pentru client (vizibilClient = true sau categoria 'predare').
--   2. get_public_tracking: lungime minima token 8 (formatul TK-XXXXX = 8 caractere; evita potriviri pe prefixe scurte).
--   3. Index functional pentru cautarea dupa token de tracking.

begin;

drop policy if exists "poze_dosare_public_tracking_read" on storage.objects;

create policy "poze_dosare_public_tracking_read" on storage.objects
for select to anon
using (
  bucket_id in ('poze-dosare', 'poze_dosare')
  and exists (
    select 1
    from public.dosare d,
         jsonb_array_elements(coalesce(d.poze, '[]'::jsonb)) as p
    where p->>'path' = storage.objects.name
      and (
        coalesce((p->>'vizibilClient')::boolean, false) is true
        or coalesce(p->>'categoria', '') = 'predare'
      )
  )
);

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
  v_poze jsonb;
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return null;
  end if;

  select * into r
  from public.dosare
  where upper(trim(tracking_token)) = upper(trim(p_token))
     or tracking_token = trim(p_token)
  limit 1;

  if not found then
    return null;
  end if;

  -- Preia branding-ul atelierului de care apartine dosarul
  if r.atelier_id is not null then
    select nume, short, logo_url
    into v_atelier
    from public.ateliere
    where id = r.atelier_id
    limit 1;
  end if;

  -- Fallback la setari id=1 daca nu s-a gasit atelierul
  if v_atelier.nume is null then
    select atelier_nume as nume, atelier_short as short, logo_url
    into v_atelier
    from public.setari
    where id = 1
    limit 1;
  end if;

  -- Filtreaza doar pozele permise clientului (vizibilClient = true sau categoria = 'predare')
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
      where (p->>'vizibilClient')::boolean is true 
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
      'nume', coalesce(v_atelier.nume, 'Service auto'),
      'short', coalesce(v_atelier.short, 'SA'),
      'logo_url', v_atelier.logo_url
    )
  );
end;
$$;

revoke all on function public.get_public_tracking(text) from public;
grant execute on function public.get_public_tracking(text) to anon, authenticated;

create index if not exists idx_dosare_tracking_token_upper
  on public.dosare (upper(trim(tracking_token)));

commit;
