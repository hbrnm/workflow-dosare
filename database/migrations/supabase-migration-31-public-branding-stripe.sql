-- Migrare 31: branding public pe slug + index stripe customer
-- Rulează după 29–30.

begin;

create or replace function public.get_public_atelier_branding(p_slug text)
returns table (
  slug text,
  nume text,
  short text,
  logo_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.slug, a.nume, a.short, a.logo_url
  from public.ateliere a
  where lower(a.slug) = lower(trim(p_slug))
  limit 1;
$$;

revoke all on function public.get_public_atelier_branding(text) from public;
grant execute on function public.get_public_atelier_branding(text) to anon, authenticated;

create index if not exists idx_ateliere_stripe_customer
  on public.ateliere (stripe_customer_id)
  where stripe_customer_id is not null;

commit;
