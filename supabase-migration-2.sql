-- Migrare 2: rulează în Supabase -> SQL Editor -> New query -> Run
-- (tabela "dosare" trebuie să existe deja, creată din supabase-schema.sql)

alter table dosare add column if not exists telefon_client text default '';
alter table dosare add column if not exists data_programare timestamp;
alter table dosare add column if not exists zile_chirie_audatex int default 0;
alter table dosare add column if not exists valoare_piese_audatex numeric default 0;
alter table dosare add column if not exists valoare_achizitie_piese numeric default 0;
alter table dosare add column if not exists blocat boolean default false;
alter table dosare add column if not exists motiv_blocare text default '';

-- Migrare date: statusurile vechi nu mai există în aplicație
-- "chemat_lucru" -> "programat" (doar denumirea s-a schimbat)
update dosare set status = 'programat' where status = 'chemat_lucru';
-- "finalizat" a fost eliminat ca etapă; dosarele rămase acolo trec în "in_lucru"
-- (nu erau încă facturate, deci rămân vizibile ca active)
update dosare set status = 'in_lucru' where status = 'finalizat';
