-- Migrare 16: persistă flag-ul „piese sosite” pe dosare
-- Rulează în Supabase: Project -> SQL Editor -> New query -> Run

alter table public.dosare
  add column if not exists piese_sosite boolean default false;

comment on column public.dosare.piese_sosite is
  'True când piesele comandate au sosit (independent de statusul pipeline).';
