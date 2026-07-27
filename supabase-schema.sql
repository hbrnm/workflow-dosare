-- Rulează acest script în Supabase: Project -> SQL Editor -> New query -> Run

create extension if not exists "pgcrypto";

create table if not exists dosare (
  id uuid primary key default gen_random_uuid(),
  numar_dosar text default '',
  tip_asigurare text default 'RCA',
  asigurator text default '',
  client text default '',
  numar_inmatriculare text default '',
  vin text default '',
  marca_model text default '',
  status text default 'primit',
  data_deschiderii date default current_date,
  data_schimbare_status timestamptz default now(),
  data_ultimei_actualizari timestamptz default now(),
  termen_alerta_zile int default 5,
  note jsonb default '[]',
  documente jsonb default '[]',
  adusa_fizic boolean default false,
  ce_este_de_reparat text default '',
  manopera jsonb default '{"tinichigerie":{"facturat":0,"alocat":0,"dataIntrareEtapa":null},"vopsitorie":{"facturat":0,"alocat":0,"dataIntrareEtapa":null}}',
  masina_schimb text default '',
  data_darii_la_schimb date,
  telefon_client text default '',
  created_at timestamptz default now()
);

-- Row Level Security
alter table dosare enable row level security;

-- Politică simplă pentru start: oricine are cheia "anon" a proiectului poate
-- citi/scrie. E suficient de sigur cât timp cheia nu e publicată, dar NU e
-- potrivit dacă dai acces public la aplicație. Când adaugi autentificare
-- (Supabase Auth) pentru colegi, înlocuiește politica de mai jos cu una
-- legată de auth.uid().
create policy "allow all for anon (temporar)" on dosare
  for all
  using (true)
  with check (true);

-- Index-uri utile pentru căutare rapidă
create index if not exists idx_dosare_status on dosare (status);
create index if not exists idx_dosare_numar_inmatriculare on dosare (numar_inmatriculare);
create index if not exists idx_dosare_numar_dosar on dosare (numar_dosar);

create table if not exists programari (
  id uuid primary key default gen_random_uuid(),
  dosar_id uuid references dosare(id) on delete cascade,
  data_programare timestamptz not null,
  nota text default '',
  created_at timestamptz default now()
);
create index if not exists idx_programari_dosar on programari (dosar_id);
create index if not exists idx_programari_data on programari (data_programare);
