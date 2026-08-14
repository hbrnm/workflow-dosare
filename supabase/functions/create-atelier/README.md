# Edge Function: create-atelier

Self-serve: creează cont Auth + atelier + membership `admin` (trial 30 zile).

## Deploy

```bash
npx supabase functions deploy create-atelier --project-ref cfkyminejjnrwxrdlndt
```

`config.toml` setează `verify_jwt = false` (endpoint public).

## Body

```json
{
  "email": "patron@atelier.ro",
  "password": "min6chars",
  "atelierNume": "Service Rapid",
  "atelierShort": "SR",
  "slug": "service-rapid"
}
```

## Response

`{ ok, atelier, user, session? }` — clientul poate folosi `session` sau `signInWithPassword`.

## Cerințe

- Migrare 29 aplicată (`ateliere`, `atelier_membri`)
