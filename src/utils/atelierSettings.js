/**
 * Mapări setări atelier ↔ legacy setari (id=1, slug=default).
 */

export function shouldMirrorSetari(slug) {
  return String(slug || "").trim().toLowerCase() === "default";
}

/** Row from public.ateliere → shape used by useSettings / normalizeBranding */
export function atelierRowToSettings(row) {
  if (!row || typeof row !== "object") return null;
  return {
    capacitate_zilnica: row.capacitate_zilnica,
    prag_ridicare_zile: row.prag_ridicare_zile,
    prag_inactivitate_zile: row.prag_inactivitate_zile,
    asiguratori: row.asiguratori,
    termene_alerta_status: row.termene_alerta_status,
    plan: row.plan,
    trial_ends_at: row.trial_ends_at,
    seat_limit: row.seat_limit,
    atelier_nume: row.nume,
    atelier_short: row.short,
    logo_url: row.logo_url,
    slug: row.slug,
  };
}

/** Branding UI → ateliere patch */
export function brandingToAtelierPatch(branding) {
  return {
    nume: branding?.atelierNume ?? branding?.atelier_nume ?? "",
    short: branding?.atelierShort ?? branding?.atelier_short ?? "WD",
    logo_url: branding?.logoUrl ?? branding?.logo_url ?? null,
  };
}

/** ateliere patch → setari id=1 mirror columns */
export function atelierPatchToSetariMirror(patch) {
  if (!patch || typeof patch !== "object") return {};
  const out = {};
  if ("nume" in patch) out.atelier_nume = patch.nume;
  if ("short" in patch) out.atelier_short = patch.short;
  if ("logo_url" in patch) out.logo_url = patch.logo_url;
  if ("capacitate_zilnica" in patch) out.capacitate_zilnica = patch.capacitate_zilnica;
  if ("prag_ridicare_zile" in patch) out.prag_ridicare_zile = patch.prag_ridicare_zile;
  if ("prag_inactivitate_zile" in patch) out.prag_inactivitate_zile = patch.prag_inactivitate_zile;
  if ("asiguratori" in patch) out.asiguratori = patch.asiguratori;
  if ("termene_alerta_status" in patch) out.termene_alerta_status = patch.termene_alerta_status;
  if ("plan" in patch) out.plan = patch.plan;
  if ("trial_ends_at" in patch) out.trial_ends_at = patch.trial_ends_at;
  if ("seat_limit" in patch) out.seat_limit = patch.seat_limit;
  return out;
}

export function brandingLogoStoragePath(atelierId, ext = "png") {
  const safeExt = String(ext || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  if (atelierId) return `atelier/${atelierId}/logo.${safeExt}`;
  return `atelier/logo.${safeExt}`;
}
