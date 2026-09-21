-- ============================================================================
-- SCRIPT COMPLET DE INIȚIALIZARE PROIECT NOU SUPABASE (WORKFLOW DOSARE)
-- Rulează acest script în Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABELUL PRINCIPAL: dosare
-- ----------------------------------------------------------------------------
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

-- Indexuri performanță pentru dosare
create index if not exists idx_dosare_status on public.dosare (status);
create index if not exists idx_dosare_numar_inmatriculare on public.dosare (numar_inmatriculare);
create index if not exists idx_dosare_numar_dosar on public.dosare (numar_dosar);
create index if not exists idx_dosare_atelier_id on public.dosare (atelier_id);
create index if not exists idx_dosare_created_at on public.dosare (created_at desc);

-- ----------------------------------------------------------------------------
-- 2. TABELUL SETARI
-- ----------------------------------------------------------------------------
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
  atelier_nume text default 'Dosare Daună',
  atelier_short text default 'WD',
  logo_url text,
  accent_color text default '#C98A2B',
  plan text default 'pro',
  trial_ends_at timestamptz,
  seat_limit int default 10,
  default_atelier_id uuid,
  updated_at timestamptz default now()
);

insert into public.setari (id, capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, atelier_nume, atelier_short, accent_color)
values (1, 5, 3, 5, 'Dosare Daună', 'WD', '#C98A2B')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. TABELE MULTI-TENANT (Ateliere & Membri)
-- ----------------------------------------------------------------------------
create table if not exists public.ateliere (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nume text not null,
  short text default 'WD',
  logo_url text,
  plan text default 'pro',
  trial_ends_at timestamptz default (now() + interval '365 days'),
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

-- Creează atelierul implicit
insert into public.ateliere (slug, nume, short, plan)
values ('default', 'Dosare Daună', 'WD', 'pro')
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- 4. TABEL ISTORIC DOSAR & ARHIVĂ
-- ----------------------------------------------------------------------------
create table if not exists public.istoric_dosar (
  id uuid primary key default gen_random_uuid(),
  dosar_id uuid references public.dosare(id) on delete cascade,
  status_vechi text,
  status_nou text,
  modificat_de text,
  campuri_modificate jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.dosare_arhiva (
  id uuid primary key,
  payload jsonb not null,
  arhivat_at timestamptz not null default now(),
  arhivat_de uuid,
  arhivat_de_email text,
  atelier_id uuid references public.ateliere(id) on delete cascade
);

create or replace function public.delete_dosar_with_archive(p_dosar_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dosare%rowtype;
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Neautentificat';
  end if;

  select * into v_row from public.dosare where id = p_dosar_id for update;
  if not found then
    return;
  end if;

  insert into public.dosare_arhiva (id, payload, arhivat_de, arhivat_de_email, atelier_id)
  values (v_row.id, to_jsonb(v_row), v_uid, v_email, v_row.atelier_id)
  on conflict (id) do update
    set payload = excluded.payload,
        arhivat_at = now(),
        arhivat_de = excluded.arhivat_de,
        arhivat_de_email = excluded.arhivat_de_email,
        atelier_id = excluded.atelier_id;

  delete from public.istoric_dosar where dosar_id = p_dosar_id;
  delete from public.dosare where id = p_dosar_id;
end;
$$;

revoke all on function public.delete_dosar_with_archive(uuid) from public;
grant execute on function public.delete_dosar_with_archive(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. VIEW-URI PUBLICE & BRANDING
-- ----------------------------------------------------------------------------
drop view if exists public.setari_publice cascade;
create view public.setari_publice
with (security_invoker = true) as
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

drop view if exists public.atelier_branding cascade;
create view public.atelier_branding
with (security_invoker = true) as
select
  id,
  atelier_nume,
  atelier_short,
  logo_url,
  accent_color
from public.setari
where id = 1;

grant select on public.atelier_branding to anon, authenticated;

-- Funcție RPC pentru obținerea brandingului public
create or replace function public.get_public_atelier_branding(p_slug text)
returns jsonb
language sql
security definer
stable
as $$
  select jsonb_build_object(
    'nume', nume,
    'short', short,
    'logo_url', logo_url,
    'slug', slug
  )
  from public.ateliere
  where slug = p_slug
  limit 1;
$$;

grant execute on function public.get_public_atelier_branding(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. STORAGE BUCKETS (Poze, Documente, Branding)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('poze-dosare', 'poze-dosare', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('documente-dosare', 'documente-dosare', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;

-- ----------------------------------------------------------------------------
-- 7. SECURITATE & ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
alter table public.dosare enable row level security;
alter table public.setari enable row level security;
alter table public.istoric_dosar enable row level security;
alter table public.ateliere enable row level security;
alter table public.atelier_membri enable row level security;

-- Politici pentru utilizatori autentificați
create policy "dosare_all_authenticated" on public.dosare
for all to authenticated using (true) with check (true);

create policy "setari_all_authenticated" on public.setari
for all to authenticated using (true) with check (true);

drop policy if exists "setari_anon_select" on public.setari;
create policy "setari_anon_select" on public.setari
for select to anon using (true);

create policy "istoric_all_authenticated" on public.istoric_dosar
for all to authenticated using (true) with check (true);

create policy "ateliere_all_authenticated" on public.ateliere
for all to authenticated using (true) with check (true);

create policy "atelier_membri_all_authenticated" on public.atelier_membri
for all to authenticated using (true) with check (true);

-- Politici Storage
drop policy if exists "poze_storage_all" on storage.objects;
create policy "poze_storage_all" on storage.objects
for all to authenticated
using (bucket_id in ('poze-dosare', 'documente-dosare', 'branding'))
with check (bucket_id in ('poze-dosare', 'documente-dosare', 'branding'));

drop policy if exists "branding_storage_public_read" on storage.objects;
create policy "branding_storage_public_read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'branding');
