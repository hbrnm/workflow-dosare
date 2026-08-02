-- Adăugare coloane pentru lista de admini și utilizatori în tabela setari
alter table public.setari
  add column if not exists admin_emails jsonb default '[]',
  add column if not exists utilizatori jsonb default '[]';
