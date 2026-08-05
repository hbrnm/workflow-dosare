-- Migrare 19: arhivare + ștergere dosar (RPC folosit de undo-delete din app)
-- Rulează în Supabase: Project -> SQL Editor -> New query -> Run

create table if not exists public.dosare_arhiva (
  id uuid primary key,
  payload jsonb not null,
  arhivat_at timestamptz not null default now(),
  arhivat_de uuid,
  arhivat_de_email text
);

alter table public.dosare_arhiva enable row level security;

drop policy if exists "admins_read_dosare_arhiva" on public.dosare_arhiva;
create policy "admins_read_dosare_arhiva"
  on public.dosare_arhiva
  for select
  to authenticated
  using (public.is_admin());

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

  if v_row.created_by is distinct from v_uid and not public.is_admin() then
    raise exception 'Poți șterge doar dosarele create de tine.';
  end if;

  insert into public.dosare_arhiva (id, payload, arhivat_de, arhivat_de_email)
  values (v_row.id, to_jsonb(v_row), v_uid, v_email)
  on conflict (id) do update
    set payload = excluded.payload,
        arhivat_at = now(),
        arhivat_de = excluded.arhivat_de,
        arhivat_de_email = excluded.arhivat_de_email;

  delete from public.dosare where id = p_dosar_id;
end;
$$;

revoke all on function public.delete_dosar_with_archive(uuid) from public;
grant execute on function public.delete_dosar_with_archive(uuid) to authenticated;
