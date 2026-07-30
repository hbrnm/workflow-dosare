-- Migrare pentru fișierul combinat (App.jsx) — rulează în Supabase -> SQL Editor
-- Sigur de rulat chiar dacă unele părți există deja (folosește "if not exists").

-- 1) Alertă mașini gata dar neridicate
alter table dosare add column if not exists gata_de_ridicare boolean default false;
alter table dosare add column if not exists data_gata_ridicare timestamptz;
alter table dosare add column if not exists ridicata boolean default false;
alter table dosare add column if not exists data_ridicare timestamptz;
alter table setari add column if not exists prag_ridicare_zile int default 3;

-- 2) Plasă de siguranță: dacă nu ai creat deja bucket-ul pentru documente
--    reale (folosit acum de upload-ul de documente din fișă), îl creează aici.
--    Dacă există deja, aceste comenzi nu strică nimic.
insert into storage.buckets (id, name, public)
values ('documente-dosare', 'documente-dosare', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated read documente'
  ) then
    create policy "authenticated read documente" on storage.objects
      for select using (bucket_id = 'documente-dosare' and auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated upload documente'
  ) then
    create policy "authenticated upload documente" on storage.objects
      for insert with check (bucket_id = 'documente-dosare' and auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'authenticated delete documente'
  ) then
    create policy "authenticated delete documente" on storage.objects
      for delete using (bucket_id = 'documente-dosare' and auth.role() = 'authenticated');
  end if;
end $$;
