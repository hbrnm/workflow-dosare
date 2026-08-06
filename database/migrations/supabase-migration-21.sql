-- Migrare 21: termen livrare piese + praguri alertă per stadiu (setări)

alter table public.dosare
  add column if not exists termen_livrare_piese text;

alter table public.setari
  add column if not exists termene_alerta_status jsonb default '{}'::jsonb;

-- Include termene_alerta_status în view-ul public (dacă există)
do $$
begin
  if exists (
    select 1 from pg_views where schemaname = 'public' and viewname = 'setari_publice'
  ) then
    execute $v$
      create or replace view public.setari_publice as
      select
        id,
        capacitate_zilnica,
        prag_ridicare_zile,
        prag_inactivitate_zile,
        utilizatori,
        asiguratori,
        termene_alerta_status,
        atelier_nume,
        atelier_short,
        logo_url,
        accent_color
      from public.setari
    $v$;
    grant select on public.setari_publice to authenticated;
  end if;
end $$;
