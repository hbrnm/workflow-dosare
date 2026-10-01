-- Migrare 46: bucket-ul poze-dosare devine PRIVAT (pasul final al remedierii C1 din audit).
--
-- NU rula inainte de:
--   1. migrarile 44 si 45;
--   2. deploy: supabase functions deploy tracking-photos --no-verify-jwt
--   3. verificare: deschide un link de tracking real si confirma ca pozele marcate pentru client se vad.
--
-- Dupa aceasta migrare:
--   - URL-urile publice directe nu mai functioneaza (404);
--   - portalul public primeste URL-uri semnate de la tracking-photos;
--   - aplicatia interna foloseste deja URL-uri semnate (refreshStorageUrls) si politica de staff din migrarea 32.
--
-- Rollback: update storage.buckets set public = true where id in ('poze-dosare','poze_dosare');
--           + recreeaza politica din migrarea 44.

begin;

update storage.buckets set public = false where id in ('poze-dosare', 'poze_dosare');

drop policy if exists "poze_dosare_public_tracking_read" on storage.objects;

commit;
