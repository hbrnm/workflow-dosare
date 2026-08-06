-- Migrare 26: Deviz & piese — atașamente deviz (Audatex / DAT / PDF)
-- Rulează în Supabase → SQL Editor

begin;

alter table public.dosare
  add column if not exists devize jsonb default '[]'::jsonb;

comment on column public.dosare.devize is 'Fișiere deviz externe [{id,tip,path,nume,incarcatLa}] tip: audatex|dat|pdf|altele';

commit;
