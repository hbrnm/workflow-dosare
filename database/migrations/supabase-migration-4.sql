-- Migrare 4: fiecare coleg vede toate dosarele, dar editează/șterge doar
-- pe cele create de el. Rulează în Supabase -> SQL Editor -> New query -> Run
-- (necesită migrarea 3 rulată deja, cu autentificare activă)

-- coloană reală de proprietate, legată de contul de autentificare
-- (created_by_email era doar pentru afișare; asta e cea folosită de securitate)
alter table dosare add column if not exists created_by uuid references auth.users(id) default auth.uid();

-- pentru dosarele adăugate înainte de această migrare, le atribuim
-- automat contului al cărui email se potrivește cu created_by_email
-- (completat deja de aplicație la fiecare salvare, din migrarea anterioară)
update dosare d
set created_by = u.id
from auth.users u
where d.created_by is null and d.created_by_email = u.email;

-- înlocuim politicile de update/delete: doar proprietarul poate edita/șterge.
-- dosarele fără proprietar (create înainte de orice migrare, fără potrivire
-- de email) rămân editabile de oricine, ca să nu rămână blocate definitiv —
-- primul coleg care le editează devine practic responsabil de ele.
drop policy if exists "authenticated update" on dosare;
drop policy if exists "authenticated delete" on dosare;

create policy "owner update" on dosare
  for update
  using (created_by = auth.uid() or created_by is null)
  with check (created_by = auth.uid() or created_by is null);

create policy "owner delete" on dosare
  for delete
  using (created_by = auth.uid() or created_by is null);

-- select și insert rămân neschimbate: toți colegii autentificați văd tot,
-- oricine poate adăuga un dosar nou (devine automat proprietarul lui).
