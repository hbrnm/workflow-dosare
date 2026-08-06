# Workflow Daune 2.0 — MVP Faza 1

Aplicație PWA (Vite + React + Supabase) pentru service auto: recepție vehicul, inspecție foto, diagramă interactivă de avarii, documente, statusuri dosar și roluri.

Versiunea anterioară rămâne în [`src/App.v1.jsx`](src/App.v1.jsx).

## Ce include MVP (Faza 1 / punctul A)

- **Recepție ghidată** (wizard): nr. înmatriculare, VIN, marcă, model, kilometraj, tip dosar (RCA / CASCO / Regie proprie / Fără asigurare)
- **Client & asigurător**: nr. dosar asigurător, inspector daună
- **Diagramă interactivă** a vehiculului (marcaje pe zone + severitate)
- **Poze & documente** (comprimare automată, Storage Supabase)
- **Documente oficiale tipizate** (PV constatare, talon, CI, poliță etc.)
- **Statusuri** pipeline (aceleași ca în v1)
- **Roluri**: `receptioner`, `mecanic`, `admin` (`operator` = legacy → receptioner)
- Listă dosare cu **căutare / filtrare** (nr. auto, client, asigurător, status)

### În afara MVP (Faza 2+)

Tracking client, Audatex, SMS/push, dashboard KPI financiar, programator calendar.

## Migrare obligatorie

În Supabase → **SQL Editor**, rulează:

[`database/migrations/supabase-migration-23-v2-mvp.sql`](database/migrations/supabase-migration-23-v2-mvp.sql)

Adaugă: `kilometraj`, `marca`, `model`, `damage_marks`, `nr_dosar_asigurator`, `inspector_dauna`, `tip_documente` + RLS staff (`is_staff`).

## Setup

```bash
cp .env.example .env
# VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Roluri

| Rol | Poate |
|-----|--------|
| **receptioner** | Creează dosare, editează tot, documente, statusuri |
| **mecanic** | Vezi dosare, note progres, poze reparație, statusuri, diagramă |
| **admin** | Tot + management utilizatori |

Rolurile se setează din tab-ul **Echipă** (email trebuie să existe în Supabase Auth).

## Structură 2.0

```
src/
  App.jsx                 ← shell 2.0
  App.v1.jsx              ← aplicația anterioară
  features/
    reception/            ← wizard recepție
    inspection/           ← diagramă avarii
    claims/               ← listă + detaliu
    admin/                ← utilizatori
  constants/roles.js
  constants/vehicleParts.js
database/migrations/supabase-migration-23-v2-mvp.sql
```

## Revenire la v1

În `src/main.jsx`, importă `App` din `./App.v1.jsx` în loc de `./App.jsx`.
