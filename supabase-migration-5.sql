-- Migrare 5: capacitate zilnică pentru Programator
-- Rulează în Supabase -> SQL Editor -> New query -> Run

create table if not exists setari (
  id int primary key default 1,
  capacitate_zilnica int default 3,
  constraint setari_singleton check (id = 1)
);

alter table setari enable row level security;

create policy "authenticated read setari" on setari
  for select using (auth.role() = 'authenticated');

create policy "authenticated write setari" on setari
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into setari (id, capacitate_zilnica) values (1, 3)
  on conflict (id) do nothing;
