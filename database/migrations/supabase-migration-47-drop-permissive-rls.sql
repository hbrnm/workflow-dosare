-- Migrare 47: elimina politicile RLS permisive "*_all_authenticated" (using true).
--
-- Problema: supabase-migration-complete-fix.sql si setup-new-supabase-project.sql creeaza
-- politici "for all to authenticated using (true)". Politicile Postgres se aduna (OR), deci
-- una singura cu "true" anuleaza izolarea pe atelier din migrarile 32/42: orice utilizator
-- logat citeste/modifica/sterge dosarele tuturor atelierelor si poate schimba setari.
--
-- Siguranta: migrarea se opreste (si nu schimba nimic) daca dosare nu are politici
-- SELECT/INSERT/UPDATE pe atelier, istoric_dosar nu are SELECT, sau lipsesc functiile
-- delete_dosar_with_archive (stergerea trece prin RPC) / is_default_atelier_admin.
--
-- Dupa aceasta migrare:
--   - dosare / istoric_dosar: raman doar politicile pe atelier (migrarile 32/42);
--   - setari: citire pentru autentificati (ca in migrarea 18), scriere doar adminul
--     atelierului default (ca in migrarea 33).
--
-- Verificare DUPA rulare (trebuie 0 randuri):
--   select tablename, policyname from pg_policies
--   where schemaname = 'public' and policyname like '%all_authenticated%';
--
-- Rollback (redeschide accesul global, doar in caz de blocaj):
--   create policy "dosare_all_authenticated" on public.dosare
--   for all to authenticated using (true) with check (true);

begin;

do $$
declare
  req record;
begin
  for req in
    select * from (values
      ('dosare', 'SELECT'), ('dosare', 'INSERT'), ('dosare', 'UPDATE'),
      ('istoric_dosar', 'SELECT')
    ) as t(tbl, cmd)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = req.tbl
        and cmd = req.cmd
        and policyname not like '%all_authenticated'
    ) then
      raise exception 'Migrarea 47 oprita: %.% nu are politica % pe atelier. Ruleaza intai migrarea 42.',
        'public', req.tbl, req.cmd;
    end if;
  end loop;

  if to_regprocedure('public.delete_dosar_with_archive(uuid)') is null then
    raise exception 'Migrarea 47 oprita: lipseste functia delete_dosar_with_archive. Ruleaza intai migrarea 28.';
  end if;
  if to_regprocedure('public.is_default_atelier_admin()') is null then
    raise exception 'Migrarea 47 oprita: lipseste functia is_default_atelier_admin. Ruleaza intai migrarea 33.';
  end if;
end $$;

drop policy if exists "dosare_all_authenticated" on public.dosare;
drop policy if exists "istoric_all_authenticated" on public.istoric_dosar;
drop policy if exists "setari_all_authenticated" on public.setari;

-- setari: starea intentionata din migrarile 18 + 33, ca aplicatia sa poata citi si
-- adminul sa poata salva dupa eliminarea politicii permisive.
drop policy if exists "authenticated_read_setari" on public.setari;
create policy "authenticated_read_setari"
on public.setari
for select
to authenticated
using (true);

drop policy if exists "admin_write_setari" on public.setari;
create policy "admin_write_setari"
on public.setari
for all
to authenticated
using (public.is_default_atelier_admin())
with check (public.is_default_atelier_admin());

commit;
