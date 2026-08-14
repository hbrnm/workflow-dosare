-- Migrare 33: setări per-tenant (ateliere = sursă de adevăr)
-- Rulează DUPĂ migrarea 32. Backward-compatible: setari id=1 rămâne oglindă pentru slug=default.
--
-- Ce face:
--   * re-sincronizează atelierul default DIN setari (setările editate după m29)
--   * strânge UPDATE pe ateliere: doar is_atelier_admin(id) (fără is_admin() global)
--   * strânge scrierea pe setari: admin pe atelierul default (sau fallback admin_emails)

begin;

-- ── 1. Re-sync default atelier ← setari (setari poate fi mai nou) ─
update public.ateliere a
set
  nume = coalesce(nullif(trim(s.atelier_nume), ''), a.nume),
  short = coalesce(nullif(trim(s.atelier_short), ''), a.short),
  logo_url = coalesce(s.logo_url, a.logo_url),
  capacitate_zilnica = coalesce(s.capacitate_zilnica, a.capacitate_zilnica),
  prag_ridicare_zile = coalesce(s.prag_ridicare_zile, a.prag_ridicare_zile),
  prag_inactivitate_zile = coalesce(s.prag_inactivitate_zile, a.prag_inactivitate_zile),
  asiguratori = case
    when s.asiguratori is not null and jsonb_typeof(s.asiguratori) = 'array'
         and jsonb_array_length(s.asiguratori) > 0
      then s.asiguratori
    else a.asiguratori
  end,
  termene_alerta_status = coalesce(s.termene_alerta_status, a.termene_alerta_status),
  plan = coalesce(nullif(s.plan, ''), a.plan),
  trial_ends_at = coalesce(s.trial_ends_at, a.trial_ends_at),
  seat_limit = coalesce(s.seat_limit, a.seat_limit)
from public.setari s
where s.id = 1
  and a.slug = 'default';

update public.setari s
set default_atelier_id = a.id
from public.ateliere a
where s.id = 1
  and a.slug = 'default'
  and (s.default_atelier_id is distinct from a.id);

-- ── 2. RLS ateliere: doar adminul acelui atelier ───────────
drop policy if exists "ateliere_admin_update" on public.ateliere;
create policy "ateliere_admin_update"
on public.ateliere
for update
to authenticated
using (public.is_atelier_admin(id))
with check (public.is_atelier_admin(id));

-- ── 3. Helper + RLS setari write (fără self-select pe setari în policy) ─
create or replace function public.is_default_atelier_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ateliere a
    where a.slug = 'default'
      and public.is_atelier_admin(a.id)
  );
$$;

revoke all on function public.is_default_atelier_admin() from public;
grant execute on function public.is_default_atelier_admin() to authenticated;

drop policy if exists "admin_write_setari" on public.setari;
create policy "admin_write_setari"
on public.setari
for all
to authenticated
using (public.is_default_atelier_admin())
with check (public.is_default_atelier_admin());

commit;
