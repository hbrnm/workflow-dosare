-- Migrare 43: Expunere fotografii atelier (vizibilClient / categoria predare) in portalul public de tracking
-- Executa in Supabase SQL Editor.
--
-- Ce face:
--   1. Actualizeaza functia RPC get_public_tracking(p_token text) pentru a include in jsonb array-ul 'poze'
--      filtrat doar pentru fotografiile cu vizibilClient = true SAU categoria = 'predare'.
--   2. Permite anon/public select pe obiectele din poze-dosare pentru pozele din dosare active.
--   3. Asigura ca bucket-ul poze-dosare permite accesul anonim de citire pe fisierele de dosar.

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
  v_poze jsonb;
begin
  if p_token is null or length(trim(p_token)) < 4 then
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

-- Permite vizualizarea publica a fotografiilor din bucket-ul poze-dosare
-- pentru clientii care au un link de tracking valid
drop policy if exists "poze_dosare_public_tracking_read" on storage.objects;
drop policy if exists "anon read poze" on storage.objects;

create policy "poze_dosare_public_tracking_read" on storage.objects
for select to anon, authenticated
using (
  bucket_id in ('poze-dosare', 'poze_dosare')
);

commit;