-- Migrare 18: restaurare SELECT pe setari pentru toți userii autentificați
-- (scrierea rămâne admin-only via admin_write_setari)

drop policy if exists "authenticated read setari" on public.setari;
drop policy if exists "authenticated_read_setari" on public.setari;

create policy "authenticated_read_setari"
  on public.setari
  for select
  to authenticated
  using (true);
