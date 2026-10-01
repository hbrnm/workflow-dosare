# ai-proxy

Proxy autentificat către Gemini. Cheia API rămâne server-side, nu ajunge în browser.

## Deploy

```bash
supabase secrets set GEMINI_API_KEY=...            # obligatoriu
supabase secrets set ALLOWED_ORIGINS=https://app.exemplu.ro,http://localhost:5173   # recomandat
supabase functions deploy ai-proxy
```

## Contract

`POST` cu `Authorization: Bearer <JWT utilizator>`:

```json
{ "body": { "contents": [...], "generationConfig": {...} },
  "models": [{ "version": "v1beta", "name": "gemini-2.0-flash" }] }
```

Răspuns: `{ "data": <răspuns Gemini> }` sau `{ "error": "...", "code": "..." }` (401 / 400 / 413 / 429 / 502 / 500).

- `models` e opțional și filtrat pe o listă permisă (`gemini-*`, `v1` / `v1beta`).
- Limită: 12 MB corp, 30 cereri/minut/utilizator (în memorie, per instanță: protecție de bază).
- Clientul (`src/utils/aiGateway.js`) cade pe cheia utilizatorului doar dacă funcția nu e deployed.
