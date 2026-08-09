-- Migrare 29: multi-tenant foundation (un atelier = spațiu izolat) + billing stub
-- Rulează în Supabase SQL Editor DUPĂ backup. Backward-compatible cu setari id=1.
--
-- Ce face:
--   * tabele ateliere + atelier_membri
--   * dosare.atelier_id (+ arhivă)
--   * backfill din setari / auth.users (un atelier implicit)
--   * RLS: SELECT dosare doar în atelierele unde ești membru
--   * is_admin() / is_staff() / user_app_role() țin cont de membership (cu fallback setari)
--   * coloane billing stub pe ateliere (+ oglindă pe setari)

begin;

-- ── 1. Ateliere ──────────────────────────────────────────────
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
    check (plan in ('trial', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  seat_limit int not null default 10,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ateliere_slug on public.ateliere (slug);

-- ── 2. Membri ──────────────────────────────────────────────
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

-- ── 3. Billing mirror pe setari (app poate citi fără join) ──
alter table public.setari
  add column if not exists plan text default 'trial',
  add column if not exists trial_ends_at timestamptz,
  add column if not exists seat_limit int default 10,
  add column if not exists default_atelier_id uuid references public.ateliere(id);

-- ── 4. Seed atelier implicit din setari ─────────────────────
insert into public.ateliere (
  id, slug, nume, short, logo_url,
  capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile,
  asiguratori, termene_alerta_status,
  plan, trial_ends_at, seat_limit
)
select
  coalesce(s.default_atelier_id, gen_random_uuid()),
  'default',
  coalesce(nullif(trim(s.atelier_nume), ''), 'Dosare Daună'),
  coalesce(nullif(trim(s.atelier_short), ''), 'WD'),
  s.logo_url,
  coalesce(s.capacitate_zilnica, 3),
  coalesce(s.prag_ridicare_zile, 3),
  coalesce(s.prag_inactivitate_zile, 7),
  coalesce(s.asiguratori, '[]'::jsonb),
  coalesce(s.termene_alerta_status, '{}'::jsonb),
  coalesce(nullif(s.plan, ''), 'trial'),
  s.trial_ends_at,
  coalesce(s.seat_limit, 10)
from public.setari s
where s.id = 1
  and not exists (select 1 from public.ateliere)
on conflict do nothing;

-- dacă setari lipsește, tot creează un atelier
insert into public.ateliere (slug, nume, short)
select 'default', 'Dosare Daună', 'WD'
where not exists (select 1 from public.ateliere);

update public.setari s
set default_atelier_id = a.id,
    plan = coalesce(s.plan, a.plan),
    trial_ends_at = coalesce(s.trial_ends_at, a.trial_ends_at, now() + interval '30 days'),
    seat_limit = coalesce(s.seat_limit, a.seat_limit)
from public.ateliere a
where s.id = 1
  and a.slug = 'default';

update public.ateliere
set trial_ends_at = coalesce(trial_ends_at, now() + interval '30 days')
where slug = 'default' and trial_ends_at is null;

-- ── 5. Backfill membri ─────────────────────────────────────
-- din utilizatori JSON
insert into public.atelier_membri (atelier_id, user_id, email, role)
select
  a.id,
  u.id,
  lower(u.email),
  case
    when lower(coalesce(elem ->> 'role', '')) = 'admin' then 'admin'
    when lower(coalesce(elem ->> 'role', '')) in ('mecanic', 'tinichigiu', 'vopsitor') then 'mecanic'
    when lower(coalesce(elem ->> 'role', '')) in ('receptioner', 'receptionist', 'consilier') then 'receptioner'
    else 'operator'
  end
from public.ateliere a
cross join public.setari s
cross join lateral jsonb_array_elements(coalesce(s.utilizatori, '[]'::jsonb)) as elem
join auth.users u on lower(u.email) = lower(elem ->> 'email')
where a.slug = 'default' and s.id = 1
on conflict (atelier_id, user_id) do update
  set email = excluded.email,
      role = excluded.role;

-- admins din admin_emails
insert into public.atelier_membri (atelier_id, user_id, email, role)
select
  a.id,
  u.id,
  lower(u.email),
  'admin'
from public.ateliere a
cross join public.setari s
cross join lateral jsonb_array_elements_text(coalesce(s.admin_emails, '[]'::jsonb)) as admin_email
join auth.users u on lower(u.email) = lower(admin_email)
where a.slug = 'default' and s.id = 1
on conflict (atelier_id, user_id) do update
  set role = 'admin',
      email = excluded.email;

-- orice user Auth rămas fără membership → operator pe atelierul default
insert into public.atelier_membri (atelier_id, user_id, email, role)
select a.id, u.id, lower(u.email), 'operator'
from public.ateliere a
cross join auth.users u
where a.slug = 'default'
  and u.email is not null
  and not exists (
    select 1 from public.atelier_membri m
    where m.atelier_id = a.id and m.user_id = u.id
  )
on conflict do nothing;

-- ── 6. dosare.atelier_id ───────────────────────────────────
alter table public.dosare
  add column if not exists atelier_id uuid references public.ateliere(id);

update public.dosare d
set atelier_id = a.id
from public.ateliere a
where d.atelier_id is null and a.slug = 'default';

create index if not exists idx_dosare_atelier_id on public.dosare (atelier_id);

alter table public.dosare_arhiva
  add column if not exists atelier_id uuid references public.ateliere(id);

update public.dosare_arhiva x
set atelier_id = coalesce(
  x.atelier_id,
  (x.payload ->> 'atelier_id')::uuid,
  (select id from public.ateliere where slug = 'default' limit 1)
)
where x.atelier_id is null;

-- ── 7. Helpers membership ──────────────────────────────────
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

create or replace function public.current_atelier_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.atelier_id
  from public.atelier_membri m
  where m.user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.atelier_membri m
      where m.user_id = auth.uid()
        and m.role = 'admin'
    )
    or exists (
      select 1
      from public.setari s
      where s.id = 1
        and (
          exists (
            select 1
            from jsonb_array_elements_text(coalesce(s.admin_emails, '[]'::jsonb)) as admin_email
            where lower(admin_email) = lower(auth.jwt() ->> 'email')
          )
          or exists (
            select 1
            from jsonb_array_elements(coalesce(s.utilizatori, '[]'::jsonb)) as elem
            where lower(elem ->> 'email') = lower(auth.jwt() ->> 'email')
              and elem ->> 'role' = 'admin'
          )
        )
    );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.atelier_membri m
      where m.user_id = auth.uid()
        and m.role in ('admin', 'receptioner', 'operator')
    )
    or exists (
      select 1
      from public.setari s
      where s.id = 1
        and exists (
          select 1
          from jsonb_array_elements(coalesce(s.utilizatori, '[]'::jsonb)) as elem
          where lower(elem ->> 'email') = lower(auth.jwt() ->> 'email')
            and coalesce(elem ->> 'role', 'operator') in ('admin', 'receptioner', 'operator', 'consilier')
        )
    );
$$;

create or replace function public.user_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select m.role
      from public.atelier_membri m
      where m.user_id = auth.uid()
      order by case m.role
        when 'admin' then 0
        when 'receptioner' then 1
        when 'operator' then 2
        else 3
      end
      limit 1
    ),
    (
      select elem ->> 'role'
      from public.setari s,
           lateral jsonb_array_elements(coalesce(s.utilizatori, '[]'::jsonb)) as elem
      where s.id = 1
        and lower(elem ->> 'email') = lower(auth.jwt() ->> 'email')
      limit 1
    ),
    case when public.is_admin() then 'admin' else 'operator' end
  );
$$;

revoke all on function public.is_atelier_member(uuid) from public;
revoke all on function public.is_atelier_admin(uuid) from public;
revoke all on function public.current_atelier_ids() from public;
grant execute on function public.is_atelier_member(uuid) to authenticated;
grant execute on function public.is_atelier_admin(uuid) to authenticated;
grant execute on function public.current_atelier_ids() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.user_app_role() to authenticated;

-- ── 8. RLS ateliere / membri ───────────────────────────────
alter table public.ateliere enable row level security;
alter table public.atelier_membri enable row level security;

drop policy if exists "ateliere_select_member" on public.ateliere;
create policy "ateliere_select_member"
on public.ateliere for select to authenticated
using (public.is_atelier_member(id) or public.is_admin());

drop policy if exists "ateliere_admin_update" on public.ateliere;
create policy "ateliere_admin_update"
on public.ateliere for update to authenticated
using (public.is_atelier_admin(id) or public.is_admin())
with check (public.is_atelier_admin(id) or public.is_admin());

drop policy if exists "membri_select_same_atelier" on public.atelier_membri;
create policy "membri_select_same_atelier"
on public.atelier_membri for select to authenticated
using (public.is_atelier_member(atelier_id) or public.is_admin());

drop policy if exists "membri_admin_write" on public.atelier_membri;
create policy "membri_admin_write"
on public.atelier_membri for all to authenticated
using (public.is_atelier_admin(atelier_id) or public.is_admin())
with check (public.is_atelier_admin(atelier_id) or public.is_admin());

-- ── 9. RLS dosare: izolare pe atelier ──────────────────────
drop policy if exists "dosare_select_authenticated" on public.dosare;
drop policy if exists "dosare_select_atelier_member" on public.dosare;

create policy "dosare_select_atelier_member"
on public.dosare
for select
to authenticated
using (
  atelier_id is null
  or public.is_atelier_member(atelier_id)
  or public.is_admin()
);

drop policy if exists "dosare_insert_own" on public.dosare;
create policy "dosare_insert_own"
on public.dosare
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    atelier_id is null
    or public.is_atelier_member(atelier_id)
  )
);

commit;
