# Workflow Dosare Daună

PWA (Vite + React + Supabase) pentru service auto — **versiunea activă: v1 (familiar) + polish desktop/Flux**.

Experimentul **2.0** rămâne în cod (`src/App.v2.jsx`) dar nu e pornit implicit.

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

## Workflow Daune 2.0 (experimental, oprit)

Codul 2.0 (recepție, deviz, decontare, tracking client) e în `src/App.v2.jsx` + `src/features/*`.

Pentru a testa 2.0 temporar, în `src/main.jsx`:

```js
import App from './App.v2.jsx'
import './styles/v2.css'
```

Migrări 2.0 (doar dacă activezi v2): `supabase-migration-23` … `27` — vezi fișierele din `database/migrations/`.

## Revenire

| Versiune | Entry point |
|----------|-------------|
| **v1 (implicit)** | `import App from './App.jsx'` |
| **2.0 (experiment)** | `import App from './App.v2.jsx'` + `v2.css` |
