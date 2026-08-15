-- Migrare 41: Curățare RLS de is_admin() global pentru ateliere și membri
-- Acest script elimină fallback-ul global de is_admin() pentru securitate cross-tenant.

begin;

drop policy if exists "ateliere_select_member" on public.ateliere;
create policy "ateliere_select_member"
on public.ateliere for select to authenticated
using (public.is_atelier_member(id));

drop policy if exists "membri_select_same_atelier" on public.atelier_membri;
create policy "membri_select_same_atelier"
on public.atelier_membri for select to authenticated
using (public.is_atelier_member(atelier_id));

drop policy if exists "membri_admin_write" on public.atelier_membri;
create policy "membri_admin_write"
on public.atelier_membri for all to authenticated
using (public.is_atelier_admin(atelier_id))
with check (public.is_atelier_admin(atelier_id));

commit;
