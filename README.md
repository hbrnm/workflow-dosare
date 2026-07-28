# Dosare Daună — aplicație standalone

Aceeași aplicație pe care ai testat-o în Claude, dar ca site propriu, accesibil
de pe orice telefon/laptop, cu date salvate într-o bază de date reală
(Supabase = Postgres găzduit, gratuit la volumul tău).

## Ai deja aplicația instalată? Rulează migrarea

Dacă ai urmat deja pașii de mai jos înainte și acum ai primit fișiere noi
(telefon client, programator, dosare blocate, valori Audatex etc.), nu iei
totul de la capăt — doar:

1. Supabase → **SQL Editor** → New query → copiezi conținutul din
   `supabase-migration-2.sql` → **Run**. (Adaugă coloanele noi și mută
   automat dosarele aflate pe statusurile vechi/eliminate.)
2. Înlocuiești `src/App.jsx` cu noua versiune din arhivă.
3. Faci commit + push pe GitHub — Vercel/Netlify redeploy automat.

## Pas 1 — Creezi baza de date (Supabase, ~5 minute)

1. Mergi pe https://supabase.com → Sign up (gratuit) → „New project".
2. Alege un nume (ex: `dosare-dauna`) și o parolă pentru DB (o poți uita după, n-o mai folosești direct).
3. După ce se creează proiectul: în meniul din stânga → **SQL Editor** → **New query**.
4. Copiază tot conținutul fișierului `supabase-schema.sql` din acest folder, lipește-l acolo și apasă **Run**.
   → Asta creează tabela `dosare` cu toate câmpurile (dosar, client, status, note, documente, manoperă etc).
5. Mergi la **Project Settings → API**. De acolo copiezi:
   - `Project URL` → îl pui în `.env` la `VITE_SUPABASE_URL`
   - `anon public key` → îl pui în `.env` la `VITE_SUPABASE_ANON_KEY`

## Pas 2 — Pregătești codul local

Ai nevoie de [Node.js](https://nodejs.org) instalat (versiunea 18+).

```bash
cd dosare-app
cp .env.example .env
# deschide .env și pune URL-ul + cheia de la Supabase
npm install
npm run dev
```

Se deschide pe `http://localhost:5173` — testezi local că merge, adaugi un
dosar de probă, verifici că apare și în Supabase (Table Editor → dosare).

## Pas 3 — Publici site-ul (Vercel, gratuit)

Cel mai simplu, fără linie de comandă:

1. Urci folderul `dosare-app` pe GitHub (creezi un repo nou, încarci fișierele).
2. Mergi pe https://vercel.com → Sign up cu contul de GitHub → **Add New Project** → alegi repo-ul.
3. La „Environment Variables" adaugi aceleași două chei din `.env`:
   `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY`.
4. Apeși **Deploy**. În ~1 minut primești un link gen `dosare-dauna.vercel.app`,
   funcțional de pe orice dispozitiv, cu HTTPS inclus.

Alternativ, la fel de simplu: [Netlify](https://netlify.com) — „Add new site →
Import an existing project", aceiași pași.

## Pas 4 (opțional) — domeniu propriu

Din panoul Vercel/Netlify → Domains → adaugi domeniul tău (ex: `dosare.numele-tau.ro`)
și urmezi instrucțiunile de DNS (2-3 înregistrări la registrarul de unde ai
cumpărat domeniul).

## Securitate — de citit înainte să dai linkul mai departe

Schema SQL din pasul 1 setează o politică „allow all" pe tabela `dosare`,
ca să funcționeze imediat. Asta înseamnă: oricine are cheia `anon` (care e
vizibilă în codul front-end, deci practic publică) poate citi și scrie în
tabelă dacă știe URL-ul.

E acceptabil cât timp:
- ești singurul care folosește link-ul, sau
- îl dai doar colegilor de încredere, direct.

Când vrei să adaugi conturi separate pentru colegi (fiecare cu user/parolă,
cu control pe ce poate vedea/edita), spune-mi — activăm **Supabase Auth** și
înlocuim politica din SQL cu una legată de `auth.uid()`. E următorul pas
firesc pentru colaborare reală, nu necesită să rescriem aplicația.

## Structura proiectului

```
dosare-app/
├── src/
│   ├── App.jsx           ← toată logica aplicației (Kanban, Listă, Dashboard, fișă dosar)
│   ├── supabaseClient.js ← conexiunea la baza de date
│   ├── main.jsx
│   └── index.css
├── supabase-schema.sql   ← rulezi o singură dată, la creare
├── .env.example
└── package.json
```
