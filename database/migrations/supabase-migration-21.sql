-- Migrare 21: termen livrare piese + praguri alertă per stadiu (setări)

alter table public.dosare
  add column if not exists termen_livrare_piese text;

alter table public.setari
  add column if not exists termene_alerta_status jsonb default '{}'::jsonb;

-- PostgreSQL nu permite CREATE OR REPLACE VIEW cu coloane inserate în mijloc
-- (interpretă schimbarea pozițională ca RENAME). Recreăm view-ul.
drop view if exists public.setari_publice;

create view public.setari_publice as
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
from public.setari;

grant select on public.setari_publice to authenticated;
