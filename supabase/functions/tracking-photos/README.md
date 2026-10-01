# tracking-photos

Returnează URL-uri semnate (1 oră) pentru pozele vizibile clientului dintr-un dosar, pe baza tokenului de tracking.
Permite ca bucket-ul `poze-dosare` să fie **privat** (vezi `database/migrations/supabase-migration-46-private-photos-bucket.sql`).

## Deploy

```bash
supabase functions deploy tracking-photos --no-verify-jwt
supabase secrets set ALLOWED_ORIGINS=https://app.exemplu.ro   # recomandat
```

Necesită migrarea 45 (`tracking_photo_paths`, executabilă doar de `service_role`).
`SUPABASE_URL` și `SUPABASE_SERVICE_ROLE_KEY` sunt injectate automat de platformă.

## Contract

`POST { "token": "TK-XXXXXXXXXX" }` → `{ "photos": [{ id, path, nume, categoria, reper, reperLabel, vizibilClient, url }] }`

- 30 cereri/minut/IP (în memorie, per instanță), token validat ca format.
- Token necunoscut → `{ "photos": [] }` (nu dezvăluie dacă dosarul există).
