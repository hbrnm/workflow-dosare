-- Migrare 25: Decontare — termen plată + sumă decont
-- Rulează în Supabase → SQL Editor

begin;

alter table public.dosare
  add column if not exists termen_plata date,
  add column if not exists suma_decont numeric default 0;

comment on column public.dosare.termen_plata is 'Termen scadență plată asigurător / client';
comment on column public.dosare.suma_decont is 'Sumă de încasat (decont)';

commit;
