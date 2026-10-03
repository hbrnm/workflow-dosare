# CLAUDE.md

Reguli de lucru pentru Workflow Dosare Daună (PWA Vite + React + Supabase pentru service auto). Contextul de produs și setup-ul sunt în `README.md`.

## 1. Principii

1. **Gândește înainte de cod:** nu presupune; spune presupunerile; dacă există mai multe interpretări, prezintă-le; dacă e neclar, oprește-te și întreabă.
2. **Simplitate:** minimul de cod care rezolvă problema; nimic speculativ, fără abstracții pentru o singură folosire.
3. **Modificări chirurgicale:** atinge doar ce cere sarcina; păstrează stilul existent; nu „îmbunătăți” codul din jur; șterge doar ce ai lăsat tu nefolosit.
4. **Execuție orientată spre rezultat:** transformă sarcina în criterii verificabile (un test care reproduce bug-ul, apoi îl face să treacă); la sarcini cu mai mulți pași, un plan scurt cu verificarea fiecărui pas.

### Deciziile proprietarului — întotdeauna ca chestionar
Orice decizie care îi revine proprietarului (produs, texte, prețuri/Stripe, furnizori, ce intră în v1 vs 2.0) i se prezintă ca **chestionar cu variante** (AskUserQuestion), cu varianta recomandată prima și marcată „(Recomandat)”. Excepție: instrucțiunile despre cum își configurează singur ceva (Supabase, Vercel, GitHub, Stripe) rămân text pas cu pas.

## 2. Proiect — ce trebuie știut

- **Versiunea activă e v1** (`src/App.jsx`). Codul 2.0 (`src/App.v2.jsx`, `src/features/*`) e oprit; nu-l activa și nu-l schimba fără cerere explicită.
- **Node 22+** obligatoriu (`.nvmrc`).
- **Teste:** Vitest, în `__tests__/` lângă cod. Orice comportament nou sau bug reparat vine cu test. Înainte de push: `npm run check` (vitest --run + vite build) — același lucru rulează CI-ul (`.github/workflows/ci.yml`).
- **Supabase:** migrațiile sunt fișiere noi în `database/migrations/` (rulate manual în SQL Editor) și se trec în lista din `README.md`. Nimic nu se rulează direct pe producție fără acordul proprietarului.
- **Multi-tenant:** dosarele aparțin unui atelier (`atelier_id`); orice citire/scriere filtrează după atelier. Statusurile se normalizează înainte de scriere (enum Postgres).
- **Securitate:** nicio cheie secretă în `src/` (doar `VITE_SUPABASE_URL` + anon key). Apelurile Gemini trec prin Edge Function `ai-proxy`; pozele din portalul public doar prin URL-uri semnate (`tracking-photos`).
- **UI:** tokenii din `src/constants/appTokens.js` (variabile `--app-*`); desktop minimalist (sidebar doar icoane), temele mobile doar pe telefon; status prin text (+ icon), nu doar culoare; fără overflow la 390px.
- **Texte:** română cu ș/ț cu virgulă; erorile spun ce s-a întâmplat și ce poate face utilizatorul.

## 3. Lucrul cu subagenți — orchestrator + agenți

Sesiunea principală e **orchestratorul**: înțelege cererea, planifică, ia deciziile sensibile și verifică tot ce aduc agenții. Agenții din `.claude/agents/` execută și raportează scurt. Proprietarul a aprobat delegarea: orchestratorul îi folosește din proprie inițiativă, după regulile de mai jos, fără să mai ceară voie.

| Agent | Model | Când |
|---|---|---|
| `explorare` | Haiku | căutări care ar cere multe citiri („unde se folosește…”, „ce view-uri au…”); doar citire |
| `testare` | Sonnet | rularea testelor Vitest / `npm run check`; întoarce doar ce a picat și de ce |
| `executie` | Sonnet | sarcini bine definite, cu model de urmat: o componentă după modelul alteia, un test după modelul altuia, aceeași schimbare în mai multe view-uri |
| `verificare` | Sonnet | înaintea fiecărui push care schimbă cod: citește diff-ul față de regulile din acest fișier |

**Rămân la orchestrator, niciodată delegate:** deciziile proprietarului (chestionar), migrațiile și orice SQL pe Supabase, Edge Functions, politicile RLS/Storage, Stripe, `vite.config.js`/PWA, dependențele noi, workflow-urile CI, commit, push, PR, merge. Tot ce atinge producția.

**Când nu deleg:** modificări mici sau legate între ele, unde explicația pentru agent ar fi mai lungă decât lucrul în sine.

**Cum deleg:** sarcina pentru agent conține tot ce îi trebuie (agentul pornește fără contextul conversației): ce să facă, fișierele exacte, fișierul-model, ce să NU atingă, cum arată „gata”. Agenți independenți (fără fișiere comune) pot rula în paralel. Ce întoarce un agent se verifică înainte de folosire: diff-ul citit de orchestrator, testele rulate. O greșeală a agentului o repară orchestratorul sau o retrimite cu instrucțiuni mai clare.

**Lucrările mari** (mai multe etape sau sesiuni): fișier de sarcină în `.tasks/NNN-nume.md` după `.tasks/README.md`, cu planul pe etape și un rezumat după fiecare etapă (ce s-a făcut, commit, ce urmează). La reluarea după pierderea contextului se citește întâi fișierul de sarcină.
