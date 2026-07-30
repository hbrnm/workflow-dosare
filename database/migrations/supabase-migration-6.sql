-- Migrare 6: istoric complet al modificărilor (audit log)
-- Rulează în Supabase -> SQL Editor -> New query -> Run

create table if not exists istoric_dosar (
  id uuid primary key default gen_random_uuid(),
  dosar_id uuid references dosare(id) on delete cascade,
  user_email text,
  modificari jsonb not null default '{}',
  created_at timestamptz default now()
);

alter table istoric_dosar enable row level security;

create policy "authenticated read istoric" on istoric_dosar
  for select using (auth.role() = 'authenticated');

-- funcția rulează cu drepturi de proprietar (security definer), ca să poată
-- scrie în istoric_dosar indiferent de politica RLS de pe dosare
create or replace function log_dosar_changes() returns trigger as $$
declare
  diffs jsonb := '{}'::jsonb;
  key text;
  ignored text[] := array['data_ultimei_actualizari', 'created_at'];
begin
  for key in select jsonb_object_keys(to_jsonb(NEW)) loop
    if key = any(ignored) then continue; end if;
    if to_jsonb(OLD)->key is distinct from to_jsonb(NEW)->key then
      diffs := diffs || jsonb_build_object(key, jsonb_build_object('old', to_jsonb(OLD)->key, 'new', to_jsonb(NEW)->key));
    end if;
  end loop;
  if diffs <> '{}'::jsonb then
    insert into istoric_dosar (dosar_id, user_email, modificari)
    values (NEW.id, NEW.updated_by_email, diffs);
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create or replace function log_dosar_creation() returns trigger as $$
begin
  insert into istoric_dosar (dosar_id, user_email, modificari)
  values (NEW.id, NEW.created_by_email, jsonb_build_object('_creat', jsonb_build_object('old', null, 'new', true)));
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_log_dosar_changes on dosare;
create trigger trg_log_dosar_changes
  after update on dosare
  for each row execute function log_dosar_changes();

drop trigger if exists trg_log_dosar_creation on dosare;
create trigger trg_log_dosar_creation
  after insert on dosare
  for each row execute function log_dosar_creation();
