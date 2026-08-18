-- Migrare 42: Complete Multi-Tenancy & Strict Row Level Security (RLS) Isolation
-- Execută în Supabase SQL Editor.

begin;

-- ── 1. Structură Tabele Multi-Tenant ───────────────────────────
create table if not exists public.ateliere (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  nume text not null default 'Dosare Daună',
  short text not null default 'WD',
  logo_url text,
  capacitate_zilnica int not null default 3,
  prag_ridicare_zile int not null default 3,
  prag_inactivitate_zile int not null default 7,
  asiguratori jsonb not null default '[]'::jsonb,
  termene_alerta_status jsonb not null default '{}'::jsonb,
  plan text not null default 'trial'
    check (plan in ('trial', 'starter', 'pro', 'enterprise', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  seat_limit int not null default 10,
  monthly_claim_limit int default null,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ateliere_slug on public.ateliere (slug);

create table if not exists public.atelier_membri (
  atelier_id uuid not null references public.ateliere(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'operator'
    check (role in ('admin', 'receptioner', 'mecanic', 'operator')),
  created_at timestamptz not null default now(),
  primary key (atelier_id, user_id)
);

create index if not exists idx_atelier_membri_user on public.atelier_membri (user_id);
create index if not exists idx_atelier_membri_email on public.atelier_membri (lower(email));
create index if not exists idx_atelier_membri_atelier on public.atelier_membri (atelier_id);

-- Asigură coloana atelier_id pe dosare & dosare_arhiva
alter table public.dosare
  add column if not exists atelier_id uuid references public.ateliere(id) on delete cascade;

alter table public.dosare_arhiva
  add column if not exists atelier_id uuid references public.ateliere(id) on delete cascade;

create index if not exists idx_dosare_atelier_id on public.dosare (atelier_id);
create index if not exists idx_dosare_arhiva_atelier_id on public.dosare_arhiva (atelier_id);

-- ── 2. Helper Functions de Securitate RLS (Security Definer) ────
create or replace function public.is_atelier_member(p_atelier_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.atelier_membri m
    where m.atelier_id = p_atelier_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_atelier_admin(p_atelier_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.atelier_membri m
    where m.atelier_id = p_atelier_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

revoke all on function public.is_atelier_member(uuid) from public;
grant execute on function public.is_atelier_member(uuid) to authenticated;

revoke all on function public.is_atelier_admin(uuid) from public;
grant execute on function public.is_atelier_admin(uuid) to authenticated;

-- Helper pentru verificare acces pe fișiere Storage (bucket poze / documente)
create or replace function public.can_access_dosar_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dosare d
    where d.id::text = split_part(object_name, '/', 1)
      and d.atelier_id is not null
      and public.is_atelier_member(d.atelier_id)
  );
$$;

revoke all on function public.can_access_dosar_storage_object(text) from public;
grant execute on function public.can_access_dosar_storage_object(text) to authenticated;

-- ── 3. Activare RLS Fail-Closed pe toate Tabelele ────────────────
alter table public.ateliere enable row level security;
alter table public.atelier_membri enable row level security;
alter table public.dosare enable row level security;
alter table public.dosare_arhiva enable row level security;

-- ── 4. Politici RLS: Tablou Ateliere ──────────────────────────────
drop policy if exists "ateliere_select_members" on public.ateliere;
create policy "ateliere_select_members" on public.ateliere
for select to authenticated
using (public.is_atelier_member(id));

drop policy if exists "ateliere_update_admins" on public.ateliere;
create policy "ateliere_update_admins" on public.ateliere
for update to authenticated
using (public.is_atelier_admin(id))
with check (public.is_atelier_admin(id));

-- ── 5. Politici RLS: Membri Atelier ───────────────────────────────
drop policy if exists "atelier_membri_select_same_atelier" on public.atelier_membri;
create policy "atelier_membri_select_same_atelier" on public.atelier_membri
for select to authenticated
using (user_id = auth.uid() or public.is_atelier_member(atelier_id));

drop policy if exists "atelier_membri_all_admins" on public.atelier_membri;
create policy "atelier_membri_all_admins" on public.atelier_membri
for all to authenticated
using (public.is_atelier_admin(atelier_id))
with check (public.is_atelier_admin(atelier_id));

-- ── 6. Politici RLS: Tablou Dosare (Izolare Strictă per Tenant) ──
drop policy if exists "dosare_select_atelier_member" on public.dosare;
create policy "dosare_select_atelier_member" on public.dosare
for select to authenticated
using (atelier_id is not null and public.is_atelier_member(atelier_id));

drop policy if exists "dosare_insert_atelier_member" on public.dosare;
create policy "dosare_insert_atelier_member" on public.dosare
for insert to authenticated
with check (atelier_id is not null and public.is_atelier_member(atelier_id));

drop policy if exists "dosare_update_atelier_member" on public.dosare;
create policy "dosare_update_atelier_member" on public.dosare
for update to authenticated
using (atelier_id is not null and public.is_atelier_member(atelier_id))
with check (atelier_id is not null and public.is_atelier_member(atelier_id));

drop policy if exists "dosare_delete_atelier_member" on public.dosare;
create policy "dosare_delete_atelier_member" on public.dosare
for delete to authenticated
using (atelier_id is not null and (created_by = auth.uid() or public.is_atelier_admin(atelier_id)));

-- ── 7. Politici RLS: Arhivă Dosare ────────────────────────────────
drop policy if exists "dosare_arhiva_select_member" on public.dosare_arhiva;
create policy "dosare_arhiva_select_member" on public.dosare_arhiva
for select to authenticated
using (atelier_id is not null and public.is_atelier_member(atelier_id));

drop policy if exists "dosare_arhiva_insert_member" on public.dosare_arhiva;
create policy "dosare_arhiva_insert_member" on public.dosare_arhiva
for insert to authenticated
with check (atelier_id is not null and public.is_atelier_member(atelier_id));

-- ── 8. Politici Storage RLS: Poze & Documente ────────────────────
drop policy if exists "poze_dosare_select_member" on storage.objects;
create policy "poze_dosare_select_member" on storage.objects
for select to authenticated
using (bucket_id in ('poze_dosare', 'documente_dosare') and public.can_access_dosar_storage_object(name));

drop policy if exists "poze_dosare_insert_member" on storage.objects;
create policy "poze_dosare_insert_member" on storage.objects
for insert to authenticated
with check (bucket_id in ('poze_dosare', 'documente_dosare') and public.can_access_dosar_storage_object(name));

drop policy if exists "poze_dosare_delete_member" on storage.objects;
create policy "poze_dosare_delete_member" on storage.objects
for delete to authenticated
using (bucket_id in ('poze_dosare', 'documente_dosare') and public.can_access_dosar_storage_object(name));

commit;
