-- Migrare 15: adaugă coloana pentru marcarea alertelor ca rezolvate
alter table dosare add column if not exists alerte_ack boolean default false;
