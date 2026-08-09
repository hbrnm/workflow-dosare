-- Audit RLS / izolare tenant (read-only)
-- Rulează în Supabase SQL Editor (rol postgres / service).
-- Interpretare: check_status = PASS | FAIL | WARN | INFO
--
-- După migrarea 32, aștepți PASS pe orphan + policies fail-closed.
-- Testele cross-user (R1–R7) rămân manuale cu 2 conturi în UI.

with checks as (
  -- Schema / helpers
  select 10 as sort_key,
         'schema_ateliere' as check_id,
         case when to_regclass('public.ateliere') is not null then 'PASS' else 'FAIL' end as check_status,
         'Tabela ateliere există' as detail
  union all
  select 11, 'schema_atelier_membri',
         case when to_regclass('public.atelier_membri') is not null then 'PASS' else 'FAIL' end,
         'Tabela atelier_membri există'
  union all
  select 12, 'fn_is_atelier_member',
         case when exists (
           select 1 from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'is_atelier_member'
         ) then 'PASS' else 'FAIL' end,
         'Funcție is_atelier_member'
  union all
  select 13, 'fn_is_atelier_staff',
         case when exists (
           select 1 from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'is_atelier_staff'
         ) then 'PASS' else 'WARN' end,
         'Funcție is_atelier_staff (migrare 32)'
  union all
  select 14, 'fn_can_access_storage',
         case when exists (
           select 1 from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'can_access_dosar_storage_object'
         ) then 'PASS' else 'WARN' end,
         'Funcție can_access_dosar_storage_object (migrare 32)'

  union all
  -- Orphans
  select 20, 'orphan_dosare',
         case when not exists (select 1 from public.dosare where atelier_id is null)
              then 'PASS' else 'FAIL' end,
         format('dosare fără atelier_id: %s', (select count(*) from public.dosare where atelier_id is null))
  union all
  select 21, 'orphan_arhiva',
         case when not exists (select 1 from public.dosare_arhiva where atelier_id is null)
              then 'PASS' else 'WARN' end,
         format('dosare_arhiva fără atelier_id: %s', (select count(*) from public.dosare_arhiva where atelier_id is null))
  union all
  select 22, 'dosare_atelier_not_null',
         case when exists (
           select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'dosare'
             and column_name = 'atelier_id' and is_nullable = 'NO'
         ) then 'PASS' else 'WARN' end,
         'dosare.atelier_id NOT NULL'

  union all
  -- Policies dosare
  select 30, 'pol_dosare_select',
         case when exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'dosare'
             and policyname = 'dosare_select_atelier_member'
         ) then 'PASS' else 'FAIL' end,
         'Policy SELECT dosare_select_atelier_member'
  union all
  select 31, 'pol_dosare_select_failopen_null',
         case when coalesce((
           select qual from pg_policies
           where schemaname = 'public' and tablename = 'dosare'
             and policyname = 'dosare_select_atelier_member'
         ), '') like '%atelier_id is null%'
              then 'FAIL' else 'PASS' end,
         'SELECT nu mai permite atelier_id IS NULL'
  union all
  select 32, 'pol_dosare_update_tenant',
         case when exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'dosare'
             and policyname = 'dosare_update_atelier_staff'
         ) then 'PASS' else 'WARN' end,
         'Policy UPDATE dosare_update_atelier_staff (migrare 32)'
  union all
  select 33, 'pol_dosare_delete_tenant',
         case when exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'dosare'
             and policyname = 'dosare_delete_atelier_owner_or_admin'
         ) then 'PASS' else 'WARN' end,
         'Policy DELETE dosare_delete_atelier_owner_or_admin (migrare 32)'

  union all
  -- istoric / arhivă / storage
  select 40, 'pol_istoric_tenant',
         case when exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'istoric_dosar'
             and policyname = 'istoric_select_atelier_member'
         ) then 'PASS' else 'WARN' end,
         'Policy istoric_select_atelier_member'
  union all
  select 41, 'pol_arhiva_tenant',
         case when exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'dosare_arhiva'
             and policyname = 'arhiva_select_atelier_admin'
         ) then 'PASS' else 'WARN' end,
         'Policy arhiva_select_atelier_admin'
  union all
  select 50, 'pol_storage_poze_select',
         case when exists (
           select 1 from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
             and policyname = 'poze_select_atelier_member'
         ) then 'PASS' else 'WARN' end,
         'Storage SELECT poze izolat pe membership'
  union all
  select 51, 'pol_storage_poze_open_read',
         case when exists (
           select 1 from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
             and policyname = 'poze_read_authenticated'
         ) then 'FAIL' else 'PASS' end,
         'Vechea poze_read_authenticated (orice authenticated) e ștearsă'
  union all
  select 52, 'pol_storage_docs_open_read',
         case when exists (
           select 1 from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
             and policyname = 'documente_read_authenticated'
         ) then 'FAIL' else 'PASS' end,
         'Vechea documente_read_authenticated e ștearsă'

  union all
  -- Inventory
  select 60, 'count_ateliere', 'INFO',
         format('ateliere: %s', (select count(*) from public.ateliere))
  union all
  select 61, 'count_membri', 'INFO',
         format('memberships: %s', (select count(*) from public.atelier_membri))
  union all
  select 62, 'count_dosare', 'INFO',
         format('dosare: %s', (select count(*) from public.dosare))
  union all
  select 63, 'users_without_membership',
         case when not exists (
           select 1 from auth.users u
           where u.email is not null
             and not exists (
               select 1 from public.atelier_membri m where m.user_id = u.id
             )
         ) then 'PASS' else 'WARN' end,
         format(
           'useri Auth fără membership: %s',
           (
             select count(*) from auth.users u
             where u.email is not null
               and not exists (
                 select 1 from public.atelier_membri m where m.user_id = u.id
               )
           )
         )
)
select check_id, check_status, detail
from checks
order by sort_key, check_id;
