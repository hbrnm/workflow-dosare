-- Migration 48: Adăugare coloană data_eveniment pe tabela dosare
-- Permite salvarea datei producerii evenimentului/accidentului direct pe tabela dosare.

alter table public.dosare add column if not exists data_eveniment date;
comment on column public.dosare.data_eveniment is 'Data producerii evenimentului rutier / accidentului';
