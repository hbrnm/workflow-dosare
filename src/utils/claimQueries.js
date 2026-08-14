/**
 * Utilitare de Interogare Optimizată, Proiecții Ușoare & Paginare Cursor pentru Supabase / PostgreSQL.
 */

import { fromDb } from "./claimDb";

/**
 * Coloane ușoare pentru randarea rapidă a listelor (Dashboard, Brief, Kanban, Programator, Tabele).
 * Omite payload-urile grele JSONB (poze mari, documente atașate, damage marks brute)
 * pentru a reduce timpul de transfer pe mobil și consumul de memorie cu >70%.
 */
export const CLAIM_LIST_COLUMNS = [
  "id",
  "atelier_id",
  "numar_dosar",
  "tip_asigurare",
  "asigurator",
  "client",
  "delegat",
  "telefon_client",
  "numar_inmatriculare",
  "vin",
  "marca_model",
  "marca",
  "model",
  "kilometraj",
  "nr_dosar_asigurator",
  "inspector_dauna",
  "status",
  "data_deschiderii",
  "data_schimbare_status",
  "data_ultimei_actualizari",
  "termen_alerta_zile",
  "data_programare",
  "data_comanda_piese",
  "termen_livrare_piese",
  "adusa_fizic",
  "ce_este_de_reparat",
  "masina_schimb",
  "valoare_piese_audatex",
  "valoare_achizitie_piese",
  "financiar",
  "blocat",
  "motiv_blocare",
  "created_by",
  "created_by_email",
  "updated_by_email",
  "gata_de_ridicare",
  "data_gata_ridicare",
  "ridicata",
  "data_ridicare",
  "incasat",
  "data_incasarii",
  "alerte_ack",
  "piese_sosite",
  "programare_status",
  "created_at",
].join(", ");

/**
 * Încarcă doar media și documentele atașate pe un dosar specific (Lazy Loading la deschiderea modalului).
 */
export async function fetchClaimMediaLazy(supabaseClient, claimId) {
  if (!supabaseClient || !claimId) return { poze: [], documente: [], devize: [] };

  const { data, error } = await supabaseClient
    .from("dosare")
    .select("id, poze, documente, devize, damage_marks, note")
    .eq("id", claimId)
    .maybeSingle();

  if (error) {
    console.warn("Eroare lazy-loading media dosar:", error);
    return { poze: [], documente: [], devize: [] };
  }

  return {
    poze: Array.isArray(data?.poze) ? data.poze : [],
    documente: Array.isArray(data?.documente) ? data.documente : [],
    devize: Array.isArray(data?.devize) ? data.devize : [],
    damageMarks: Array.isArray(data?.damage_marks) ? data.damage_marks : [],
    note: Array.isArray(data?.note) ? data.note : [],
  };
}

/**
 * Paginare bazată pe Cursor / Keyset (O(1) complexity, elimină degradarea OFFSET pe volume mari).
 */
export async function fetchClaimsKeyset(
  supabaseClient,
  { atelierId = null, cursorCreatedAt = null, limit = 50, status = null } = {}
) {
  if (!supabaseClient) return { claims: [], nextCursor: null, hasMore: false };

  let query = supabaseClient
    .from("dosare")
    .select(CLAIM_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (atelierId) {
    query = query.eq("atelier_id", atelierId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (cursorCreatedAt) {
    query = query.lt("created_at", cursorCreatedAt);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Eroare la citirea dosarelor cu paginare keyset.");
  }

  const rawRows = data || [];
  const hasMore = rawRows.length > limit;
  const pageRows = hasMore ? rawRows.slice(0, limit) : rawRows;
  const nextCursor = hasMore && pageRows.length ? pageRows[pageRows.length - 1].created_at : null;

  return {
    claims: pageRows.map(fromDb),
    nextCursor,
    hasMore,
  };
}
