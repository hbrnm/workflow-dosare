# Workflow Dosare Daună

PWA (Vite + React + Supabase) pentru service auto — **versiunea activă: v1 (familiar) + polish desktop/Flux**.

## Ce rulează acum (v1)

- **Flux** kanban pe faze — carduri compacte, 2 pe rând, status prescurtat
- **Piese comandate** — date comandă/livrare + bifă „Au sosit piesele?” la hover pe card
- **Brief alerte**, **Tabel dosare**, **Programator**, **Dashboard**, **Rapoarte**
- **Desktop** minimalist — sidebar fix doar icoane, tokeni dark, modale proprii
- **Mobil** — layout + teme vizuale (Atelier, Sport, Forge, Pulse…)
- **Programări** din dosar, onorat/neonorat în Programator
- Command palette (Ctrl+K), export Excel, branding atelier

## Polish desktop (recent)

- Sidebar **icon-only**, fără extindere la hover
- Teme mobile **doar pe telefon** — desktop separat vizual
- Carduri Flux mai curate (status: Acord, Lucru, Piese…)

## Setup local

Necesită **Node 22+** (`pdfjs-dist` folosește `Promise.withResolvers`; `supabase-js` cere WebSocket nativ).

```bash
cp .env.example .env   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Deschide `http://localhost:5173`.

## Migrări Supabase (v1 — obligatorii)

Rulează în **SQL Editor** dacă lipsesc:

1. [`database/migrations/supabase-migration-21.sql`](database/migrations/supabase-migration-21.sql) — `termen_livrare_piese`
2. [`database/migrations/supabase-migration-22.sql`](database/migrations/supabase-migration-22.sql) — `programare_status` (onorat/neonorat)

3. [`database/migrations/supabase-migration-44-audit-security.sql`](database/migrations/supabase-migration-44-audit-security.sql) — restrânge citirea anonimă din Storage și întărește tracking-ul public

4. [`database/migrations/supabase-migration-45-tracking-hardening.sql`](database/migrations/supabase-migration-45-tracking-hardening.sql) — limită de rată pe RPC-ul public de tracking, fix pentru dosare fără `atelier_id`, `tracking_photo_paths`
5. *(după deploy `tracking-photos` și verificare)* [`database/migrations/supabase-migration-46-private-photos-bucket.sql`](database/migrations/supabase-migration-46-private-photos-bucket.sql) — bucket `poze-dosare` privat; pozele din portal vin ca URL-uri semnate
6. [`database/migrations/supabase-migration-47-drop-permissive-rls.sql`](database/migrations/supabase-migration-47-drop-permissive-rls.sql) — elimină politicile `*_all_authenticated` (`using (true)`) care anulau izolarea pe atelier; scrierea în `setari` rămâne doar pentru admin

Edge functions noi: `ai-proxy` (Gemini) și `tracking-photos` (URL-uri semnate pentru portalul public); vezi README-ul fiecăreia în `supabase/functions/`.

Chei AI: apelurile Gemini trec prin edge function-ul `ai-proxy` (vezi `supabase/functions/ai-proxy/README.md`: `GEMINI_API_KEY` în Supabase Secrets + deploy). Cheia din Setări e doar rezervă dacă funcția nu e disponibilă; variabilele `VITE_*` nu se mai citesc.

## Teste și CI

```bash
npm test           # vitest (watch)
npm run check      # vitest --run + vite build
```

CI (`.github/workflows/ci.yml`) rulează testele și build-ul la fiecare PR. Jobul `npm audit` e informativ:
`xlsx@0.18.5` are advisory-uri fără fix pe npm; versiunea 0.20.x se instalează doar din CDN-ul SheetJS.
`xlsx` e folosit doar pentru export și pentru parsarea fișierelor Audatex încărcate de utilizator.
