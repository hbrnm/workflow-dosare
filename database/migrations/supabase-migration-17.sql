-- Migrare 17: view setari_publice (fără admin_emails) — există deja în prod, lipsea din repo
-- Rulează în Supabase doar dacă view-ul nu există încă

create or replace view public.setari_publice as
select
  id,
  capacitate_zilnica,
  prag_ridicare_zile,
  prag_inactivitate_zile,
  utilizatori,
  asiguratori
from public.setari;

grant select on public.setari_publice to authenticated;
