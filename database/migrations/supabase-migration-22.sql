-- Status onorare programare: 'onorata' | 'neonorata' | NULL (nefăcut)
alter table public.dosare
  add column if not exists programare_status text;

comment on column public.dosare.programare_status is
  'Marcare programare în Programator: onorata (prezentat) | neonorata (absent) | NULL';
