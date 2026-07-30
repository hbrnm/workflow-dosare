-- Migrare 10: optimizare indexare pentru programări service și mașină la schimb
-- Rulează în Supabase Editor dacă dorești performanță sporită la interogările pe dată de programare

begin;

-- Index pentru interogări rapide după data programării
create index if not exists idx_dosare_data_programare
  on public.dosare (data_programare);

-- Index pentru mașină la schimb
create index if not exists idx_dosare_masina_schimb
  on public.dosare (masina_schimb)
  where masina_schimb <> '';

commit;
