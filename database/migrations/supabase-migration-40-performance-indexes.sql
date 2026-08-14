-- =============================================================================
-- Migrare 40: Optimizare Performanță PostgreSQL & Indexare Compusă (High-Throughput)
-- =============================================================================
-- Obiectiv:
--   1. Elimină Sequential Scans (Seq Scan) pe tabela `public.dosare`
--   2. Elimină sortările pe disc (External Merge Disk) la `ORDER BY created_at DESC`
--   3. Accelerează filtrarea pe stadii operaționale și alerte de inactivitate
--   4. Indexează căutările frecvente după Număr Înmatriculare și Număr Dosar
-- =============================================================================

begin;

-- 1. Index Compus Principal: Izolare Multi-Tenant + Sortare Cronologică O(1)
-- Acoperă interogările principale din useClaims: SELECT ... WHERE atelier_id = $1 ORDER BY created_at DESC
create index if not exists idx_dosare_atelier_created_at
  on public.dosare (atelier_id, created_at desc);

-- 2. Index Compus: Izolare Multi-Tenant + Stadiu Operațional
-- Acoperă Tabloul pe Faze, Kanban, Flux și Filtrele de Stadiu
create index if not exists idx_dosare_atelier_status
  on public.dosare (atelier_id, status);

-- 3. Index Compus: Izolare Multi-Tenant + Dată Programare
-- Acoperă Modulul Programator & Programări Zilnice (Calendar)
create index if not exists idx_dosare_atelier_data_programare
  on public.dosare (atelier_id, data_programare)
  where data_programare is not null;

-- 4. Index Compus: Alerte Inactivitate & Calcul Depășiri Termene
-- Acoperă Centrul de Alerte și Brief Zilnic pentru dosare stagnate
create index if not exists idx_dosare_atelier_data_schimbare_status
  on public.dosare (atelier_id, data_schimbare_status desc);

-- 5. Indexuri de Căutare Rapidă (Număr Înmatriculare & Număr Dosar)
create index if not exists idx_dosare_atelier_numar_inmatriculare
  on public.dosare (atelier_id, numar_inmatriculare);

create index if not exists idx_dosare_atelier_numar_dosar
  on public.dosare (atelier_id, numar_dosar);

-- 6. Index Parțial pe Dosare Active (Work-In-Progress)
-- Filtrează doar dosarele active aflate în fluxul de lucru al atelierului
create index if not exists idx_dosare_active_workflow
  on public.dosare (atelier_id, status, created_at desc)
  where status not in ('predat', 'inchis', 'facturat_incasat');

-- 7. Index pe Cheia Străină din Istoric Dosar (Prevenire N+1 la încărcare audit)
create index if not exists idx_istoric_dosar_dosar_id
  on public.istoric_dosar (dosar_id, created_at desc);

-- 8. Index pe Tokenul Public de Urmărire (Tracking Client)
create index if not exists idx_dosare_tracking_token
  on public.dosare (tracking_token)
  where tracking_token is not null and tracking_token <> '';

commit;
