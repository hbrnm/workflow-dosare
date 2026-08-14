-- Migrare 30: RPC bootstrap_atelier — self-serve după Auth signup (fallback la edge create-atelier)
-- Rulează după migrarea 29.

begin;

create or replace function public.bootstrap_atelier(
  p_nume text,
  p_short text default null,
  p_slug text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_nume text := nullif(trim(p_nume), '');
  v_short text := upper(left(coalesce(nullif(trim(p_short), ''), regexp_replace(coalesce(p_nume, ''), '[^A-Za-z0-9]', '', 'g')), 4));
  v_slug text := lower(trim(coalesce(nullif(trim(p_slug), ''), '')));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Neautentificat';
  end if;
  if v_nume is null or char_length(v_nume) < 2 then
    raise exception 'Nume atelier invalid';
  end if;
  if exists (select 1 from public.atelier_membri m where m.user_id = v_uid) then
    raise exception 'Ai deja un atelier. Conectează-te.';
  end if;

  if v_short is null or v_short = '' then
    v_short := 'AT';
  end if;

  if v_slug is null or v_slug = '' then
    v_slug := regexp_replace(lower(v_nume), '[^a-z0-9]+', '-', 'g');
    v_slug := trim(both '-' from v_slug);
  end if;
  if v_slug is null or v_slug = '' then
    v_slug := 'atelier';
  end if;
  v_slug := left(v_slug, 48);

  if exists (select 1 from public.ateliere a where a.slug = v_slug) then
    v_slug := left(v_slug, 40) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  insert into public.ateliere (slug, nume, short, plan, trial_ends_at, seat_limit)
  values (v_slug, v_nume, v_short, 'trial', now() + interval '30 days', 10)
  returning id into v_id;

  insert into public.atelier_membri (atelier_id, user_id, email, role)
  values (v_id, v_uid, coalesce(nullif(v_email, ''), 'unknown'), 'admin');

  return v_id;
end;
$$;

revoke all on function public.bootstrap_atelier(text, text, text) from public;
grant execute on function public.bootstrap_atelier(text, text, text) to authenticated;

commit;
