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

## Istoric modificări, poze reale, PDF, recunoaștere client/vehicul, validări

**Istoric modificări (audit log)** — fiecare schimbare pe un dosar (status,
valori, notă adăugată etc.) e înregistrată automat la nivel de bază de date
(nu poate fi ocolită din aplicație), cu cine și când a modificat. Se vede
în fișa dosarului, sub „Istoric modificări" (secțiune expandabilă).

**Poze reale** — poți încărca poze direct din telefon/calculator (nu doar
linkuri), stocate privat în Supabase Storage, vizibile doar echipei logate.

**PDF automat** — buton „PDF" în fișa dosarului generează un proces
verbal/fișă cu toate datele completate, gata de printat sau trimis.

**Client/vehicul cunoscut** — când completezi telefonul sau VIN-ul, dacă mai
există dosare cu aceleași date, apare un mic avertisment cu istoricul lor
(click direct pe unul te duce la acel dosar).

**Validări** — avertisment dacă adaugi un dosar nou cu un număr de
înmatriculare care are deja un dosar activ; avertisment dacă marchezi un
dosar ca „Facturat" fără nicio valoare de manoperă/piese completată (nu
blochează, doar confirmă că știi ce faci).

**Pași — rulezi migrările 6 și 7:**
1. Supabase → SQL Editor → rulezi `supabase-migration-6.sql` (istoric).
2. Supabase → SQL Editor → rulezi `supabase-migration-7.sql` (poze — creează
   bucket-ul de stocare + coloana `poze`).
3. Înlocuiești `src/App.jsx` și `package.json` cu cele din arhivă, apoi:
   ```bash
   npm install
   ```
   (adaugă biblioteca `jspdf`, necesară pentru generarea PDF-urilor)
4. Push pe GitHub → redeploy automat.

Notă: linkurile semnate pentru poze sunt valabile 1 an; dacă o poză nu se
mai încarcă după mult timp, va trebui regenerat link-ul (îmbunătățire
posibilă pe viitor, dacă devine relevant).

## Programator tip calendar + capacitate zilnică, și Rapoarte financiare

**Programator** — pe lângă lista de programări, ai acum un calendar lunar:
fiecare zi arată câte mașini sunt programate față de capacitatea setată
(verde = sub capacitate, galben = la capacitate, roșu = suprarezervat). Dai
click pe o zi ca să filtrezi lista de dedesubt doar la programările din acea
zi. Capacitatea (mașini/zi) e o setare comună pentru toată echipa, editabilă
direct din pagină.

**Rapoarte** — marjă reală per dosar (valoare piese Audatex minus achiziție
piese service) + venit manoperă (tinichigerie + vopsitorie), calculate pe
dosarele facturate. Ai total pe lună (grafic), total pe asigurător (grafic)
și un tabel detaliat sortabil.

**Pas — rulezi a cincea migrare:**
Supabase → **SQL Editor** → New query → copiezi conținutul din
`supabase-migration-5.sql` → **Run**. Creează tabela `setari` (un singur
rând, capacitatea zilnică).

Apoi înlocuiești `src/App.jsx` cu versiunea nouă din arhivă și faci push.

## Fiecare vede tot, dar editează doar ce a creat el

Peste autentificarea de mai sus, am adăugat o regulă suplimentară: toți
colegii logați văd toate dosarele, dar pot edita sau șterge doar pe cele pe
care le-au creat ei. Dosarele altora se deschid tot, dar în mod „doar
vizualizare" (fără buton de salvare/ștergere).

**Pas — rulezi a patra migrare:**
Supabase → **SQL Editor** → New query → copiezi conținutul din
`supabase-migration-4.sql` → **Run**. Asta:
- adaugă coloana reală de proprietate (`created_by`, legată de contul de login)
- atribuie automat dosarele existente contului al cărui email se potrivește
  (din `created_by_email`, completat de migrarea anterioară)
- înlocuiește politicile de update/delete cu una care verifică proprietarul

Apoi înlocuiești `src/App.jsx` cu versiunea nouă din arhivă și faci
push — restul rămâne la fel.

Notă: dosarele foarte vechi, dinainte de orice migrare de autentificare, pot
rămâne fără proprietar dacă emailul nu s-a potrivit cu niciun cont. Acestea
rămân editabile de oricine (ca să nu blocăm date istorice) — primul coleg
care le atinge devine practic responsabil de ele de-atunci încolo.

## Conturi separate pentru colegi (Supabase Auth)

Acum aplicația cere login — fiecare coleg are propriul cont (email + parolă),
iar fiecare dosar reține automat cine l-a creat și cine l-a modificat ultima
dată. Toți colegii logați văd și pot edita toate dosarele (o singură bază
comună, nu una separată per persoană).

**Pas 1 — rulezi migrarea:**
Supabase → **SQL Editor** → New query → copiezi conținutul din
`supabase-migration-3.sql` → **Run**. Asta înlocuiește politica veche
(„oricine cu cheia anon") cu una care cere cont autentificat, și adaugă
coloanele `created_by_email` / `updated_by_email`.

**Pas 2 — dezactivezi înscrierea publică (recomandat):**
Supabase → **Authentication → Providers → Email** → oprești opțiunea
„Allow new users to sign up". Așa, aplicația rămâne privată — doar conturile
pe care le creezi tu manual pot intra.

**Pas 3 — creezi un cont pentru fiecare coleg:**
Supabase → **Authentication → Users → Add user**
- pui emailul colegului
- pui o parolă temporară
- bifezi „Auto Confirm User" (ca să nu mai fie nevoie de email de confirmare)

Îi trimiți colegului emailul + parola temporară, direct (WhatsApp, verbal
etc.). La prima logare poate să-și schimbe parola din Supabase dacă vrei să
le dai și acces la resetare, sau îi schimbi tu parola oricând din același
ecran.

**Pas 4 — redeploy:**
Înlocuiești `src/App.jsx` cu versiunea nouă din arhivă, faci commit + push —
Vercel/Netlify redeploy automat.

Nu uita: `VITE_SUPABASE_ANON_KEY` din `.env`/Vercel rămâne aceeași — ea doar
identifică proiectul Supabase, nu dă acces la date; accesul e controlat acum
strict de login.

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
