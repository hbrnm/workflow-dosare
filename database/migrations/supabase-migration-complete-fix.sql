-- ============================================================================
-- SCRIPT COMPLET DE SINCRONIZARE BAZĂ DE DATE SUPABASE (WORKFLOW DOSARE)
-- Rulează acest script în Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Tabelul principal: dosare
create table if not exists public.dosare (
  id uuid primary key default gen_random_uuid(),
  numar_dosar text default '',
  tip_asigurare text default 'RCA',
  asigurator text default '',
  client text default '',
  delegat text default '',
  telefon_client text default '',
  numar_inmatriculare text default '',
  vin text default '',
  marca_model text default '',
  marca text default '',
  model text default '',
  kilometraj numeric,
  damage_marks jsonb default '[]'::jsonb,
  tip_documente jsonb default '[]'::jsonb,
  nr_dosar_asigurator text default '',
  inspector_dauna text default '',
  status text default 'deschidere',
  data_deschiderii date default current_date,
  data_schimbare_status timestamptz default now(),
  data_ultimei_actualizari timestamptz default now(),
  termen_alerta_zile int default 3,
  data_programare timestamp,
  data_comanda_piese date,
  termen_livrare_piese date,
  programare_status text,
  note jsonb default '[]'::jsonb,
  documente jsonb default '[]'::jsonb,
  poze jsonb default '[]'::jsonb,
  adusa_fizic boolean default false,
  ce_este_de_reparat text default '',
  operatiuni jsonb default '{"inl":false,"rev":false,"rep":false,"uni":false}'::jsonb,
  manopera jsonb default '{"tinichigerie":{"facturat":0,"alocat":0,"dataIntrareEtapa":null},"vopsitorie":{"facturat":0,"alocat":0,"dataIntrareEtapa":null}}'::jsonb,
  masina_schimb text default '',
  data_darii_la_schimb date,
  zile_chirie_audatex int default 0,
  valoare_piese_audatex numeric default 0,
  valoare_achizitie_piese numeric default 0,
  financiar jsonb default '{"tvaProc":21,"pieseFacturateFaraTva":0,"costManoperaInterna":0,"costManoperaTinichigerieService":0,"costManoperaVopsitorieService":0,"oreLucrateTinichigerie":0,"oreLucrateVopsitorie":0,"costMaterialeVopsitorieService":0,"costConsumabileTinichigerieService":0,"costuriExterne":0,"costMasinaSchimb":0,"numarFactura":"","dataFactura":null}'::jsonb,
  blocat boolean default false,
  motiv_blocare text default '',
  created_by uuid,
  created_by_email text default '',
  updated_by_email text default '',
  atelier_id uuid,
  gata_de_ridicare boolean default false,
  data_gata_ridicare timestamptz,
  ridicata boolean default false,
  data_ridicare timestamptz,
  incasat boolean default false,
  data_incasarii date,
  alerte_ack boolean default false,
  piese_sosite boolean default false,
  tracking_token text,
  termen_plata date,
  suma_decont numeric default 0,
  devize jsonb default '[]'::jsonb,
  mesaj_client text default '',
  created_at timestamptz default now()
);

-- Adăugare coloane în caz că tabelul exista deja dintr-o versiune anterioară
alter table public.dosare add column if not exists delegat text default '';
alter table public.dosare add column if not exists marca text default '';
alter table public.dosare add column if not exists model text default '';
alter table public.dosare add column if not exists kilometraj numeric;
alter table public.dosare add column if not exists damage_marks jsonb default '[]'::jsonb;
alter table public.dosare add column if not exists tip_documente jsonb default '[]'::jsonb;
alter table public.dosare add column if not exists nr_dosar_asigurator text default '';
alter table public.dosare add column if not exists inspector_dauna text default '';
alter table public.dosare add column if not exists programare_status text;
alter table public.dosare add column if not exists data_comanda_piese date;
alter table public.dosare add column if not exists termen_livrare_piese date;
alter table public.dosare add column if not exists created_by uuid;
alter table public.dosare add column if not exists created_by_email text default '';
alter table public.dosare add column if not exists updated_by_email text default '';
alter table public.dosare add column if not exists atelier_id uuid;
alter table public.dosare add column if not exists gata_de_ridicare boolean default false;
alter table public.dosare add column if not exists data_gata_ridicare timestamptz;
alter table public.dosare add column if not exists ridicata boolean default false;
alter table public.dosare add column if not exists data_ridicare timestamptz;
alter table public.dosare add column if not exists incasat boolean default false;
alter table public.dosare add column if not exists data_incasarii date;
alter table public.dosare add column if not exists alerte_ack boolean default false;
alter table public.dosare add column if not exists piese_sosite boolean default false;
alter table public.dosare add column if not exists tracking_token text;
alter table public.dosare add column if not exists termen_plata date;
alter table public.dosare add column if not exists suma_decont numeric default 0;
alter table public.dosare add column if not exists devize jsonb default '[]'::jsonb;
alter table public.dosare add column if not exists mesaj_client text default '';

-- 2. Tabelul setari
create table if not exists public.setari (
  id int primary key default 1,
  capacitate_zilnica int default 5,
  prag_ridicare_zile int default 3,
  prag_inactivitate_zile int default 5,
  asiguratori jsonb default '[]'::jsonb,
  branding jsonb default '{}'::jsonb,
  admin_emails jsonb default '[]'::jsonb,
  utilizatori jsonb default '[]'::jsonb,
  billing jsonb default '{}'::jsonb,
  manopera_tarife jsonb default '{}'::jsonb,
  termene_alerta_status jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

insert into public.setari (id, capacitate_zilnica, prag_ridicare_zile)
values (1, 5, 3)
on conflict (id) do nothing;

-- 3. Tabelul istoric_dosar
create table if not exists public.istoric_dosar (
  id uuid primary key default gen_random_uuid(),
  dosar_id uuid references public.dosare(id) on delete cascade,
  status_vechi text,
  status_nou text,
  modificat_de text,
  campuri_modificate jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4. Multi-tenant (Ateliere & Membri)
create table if not exists public.ateliere (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nume text not null,
  short text default 'WD',
  logo_url text,
  plan text default 'trial',
  trial_ends_at timestamptz default (now() + interval '30 days'),
  seat_limit int default 10,
  capacitate_zilnica int default 5,
  prag_ridicare_zile int default 3,
  prag_inactivitate_zile int default 5,
  asiguratori jsonb default '[]'::jsonb,
  termene_alerta_status jsonb default '{}'::jsonb,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

create table if not exists public.atelier_membri (
  id uuid primary key default gen_random_uuid(),
  atelier_id uuid references public.ateliere(id) on delete cascade,
  user_id uuid,
  email text not null,
  role text default 'admin',
  created_at timestamptz default now(),
  unique(atelier_id, user_id)
);

-- Creează atelierul implicit dacă nu există niciunul
insert into public.ateliere (slug, nume, short, plan)
values ('default', 'Dosare Daună', 'WD', 'pro')
on conflict (slug) do nothing;

-- Backfill: asigură că orice dosar fără atelier_id primește atelierul default
update public.dosare
set atelier_id = (select id from public.ateliere order by created_at limit 1)
where atelier_id is null;

-- Adaugă utilizatorii autentificați existenți ca membri admin în atelierul default
insert into public.atelier_membri (atelier_id, user_id, email, role)
select
  (select id from public.ateliere order by created_at limit 1),
  u.id,
  coalesce(u.email, 'admin@service.ro'),
  'admin'
from auth.users u
where not exists (
  select 1 from public.atelier_membri m where m.user_id = u.id
)
on conflict do nothing;

-- 5. Storage Buckets (Poze & Documente)
insert into storage.buckets (id, name, public)
values ('poze-dosare', 'poze-dosare', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('documente-dosare', 'documente-dosare', false)
on conflict (id) do update set public = false;

-- 6. Politici RLS Permisive și Sigure pentru Autentificați
alter table public.dosare enable row level security;
alter table public.setari enable row level security;
alter table public.istoric_dosar enable row level security;
alter table public.ateliere enable row level security;
alter table public.atelier_membri enable row level security;

-- Politici dosare (Permite utilizatorilor autentificați acces complet)
drop policy if exists "dosare_all_authenticated" on public.dosare;
drop policy if exists "allow all for anon (temporar)" on public.dosare;
drop policy if exists "dosare_select_authenticated" on public.dosare;
drop policy if exists "dosare_select_atelier_member" on public.dosare;
drop policy if exists "dosare_insert_own" on public.dosare;
drop policy if exists "dosare_update_own" on public.dosare;
drop policy if exists "dosare_update_atelier_staff" on public.dosare;
drop policy if exists "dosare_delete_own" on public.dosare;
drop policy if exists "dosare_delete_atelier_owner_or_admin" on public.dosare;

create policy "dosare_all_authenticated"
on public.dosare
for all
to authenticated
using (true)
with check (true);

-- Politici setari
drop policy if exists "setari_all_authenticated" on public.setari;
create policy "setari_all_authenticated"
on public.setari
for all
to authenticated
using (true)
with check (true);

-- Politici istoric_dosar
drop policy if exists "istoric_all_authenticated" on public.istoric_dosar;
create policy "istoric_all_authenticated"
on public.istoric_dosar
for all
to authenticated
using (true)
with check (true);

-- Politici ateliere & membri
drop policy if exists "ateliere_all_authenticated" on public.ateliere;
create policy "ateliere_all_authenticated"
on public.ateliere
for all
to authenticated
using (true)
with check (true);

drop policy if exists "atelier_membri_all_authenticated" on public.atelier_membri;
create policy "atelier_membri_all_authenticated"
on public.atelier_membri
for all
to authenticated
using (true)
with check (true);

-- Politici Storage pentru poze și documente
drop policy if exists "poze_storage_all" on storage.objects;
create policy "poze_storage_all"
on storage.objects
for all
to authenticated
using (bucket_id in ('poze-dosare', 'documente-dosare'))
with check (bucket_id in ('poze-dosare', 'documente-dosare'));

-- 7. Index-uri de performanță
create index if not exists idx_dosare_status on public.dosare (status);
create index if not exists idx_dosare_numar_inmatriculare on public.dosare (numar_inmatriculare);
create index if not exists idx_dosare_numar_dosar on public.dosare (numar_dosar);
create index if not exists idx_dosare_created_at on public.dosare (created_at desc);
