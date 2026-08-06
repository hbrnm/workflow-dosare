# Workflow Daune 2.0

PWA (Vite + React + Supabase) pentru service auto.

Versiunea anterioară: [`src/App.v1.jsx`](src/App.v1.jsx).

## Ce include acum

### Faza 1A — Nucleu
- Wizard **Recepție** (VIN, marcă, model, km, tip dosar)
- **Diagramă avarii** interactivă
- Poze + documente tipizate
- Statusuri pipeline + roluri `receptioner` / `mecanic` / `admin`

### Faza 1B — Operațional
- **Flux** pe faze (mutare status)
- **Alerte** operaționale
- **Programări** (calendar din v1)
- **Dashboard** KPI (active, timp mediu, restanțe asigurători)

### Faza 2 — Client
- Link **tracking public**: `https://domeniul-tau/?track=TOKEN`
- Buton „Copiază link tracking client” în fișa dosarului

## Migrări Supabase (obligatoriu)

Rulează în ordine în **SQL Editor**:

1. [`database/migrations/supabase-migration-23-v2-mvp.sql`](database/migrations/supabase-migration-23-v2-mvp.sql) — câmpuri recepție / avarii / roluri staff  
2. [`database/migrations/supabase-migration-24-tracking.sql`](database/migrations/supabase-migration-24-tracking.sql) — token + RPC `get_public_tracking`

## Setup local / test

```bash
git checkout cursor/workflow-daune-2-mvp-c50e
cp .env.example .env   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Deschide `http://localhost:5173`.

### Preview Vercel
Deploy branch-ul `cursor/workflow-daune-2-mvp-c50e` (nu `main`) → primești un URL de preview.  
Merge pe `main` doar după ce ai testat + migrările 23–24.

### Tracking client
1. Deschide un dosar → **Copiază link tracking client**
2. Deschide linkul într-o fereastră privată (fără login)

## Revenire la v1
În `src/main.jsx` importă din `./App.v1.jsx`.
