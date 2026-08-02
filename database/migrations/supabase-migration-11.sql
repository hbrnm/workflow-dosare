-- Tab financiar: TVA, costuri și date de facturare, păstrate într-un singur obiect.
alter table public.dosare
  add column if not exists financiar jsonb default '{"tvaProc":19,"pieseFacturateFaraTva":0,"costManoperaInterna":0,"costuriExterne":0,"costMasinaSchimb":0,"numarFactura":"","dataFactura":null}';
