-- Migrare 14: Câmpuri noi pentru delegat, operațiuni bife și dată comandă piese
-- Rulează în Supabase Dashboard: Project -> SQL Editor -> New Query -> Run

ALTER TABLE public.dosare 
ADD COLUMN IF NOT EXISTS delegat text DEFAULT '',
ADD COLUMN IF NOT EXISTS operatiuni jsonb DEFAULT '{"inl": false, "rev": false, "rep": false, "uni": false}'::jsonb,
ADD COLUMN IF NOT EXISTS data_comanda_piese text DEFAULT NULL;
