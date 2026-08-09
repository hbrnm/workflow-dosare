import { todayISO } from "./dateUtils";

/** Safe filename segment */
export function sanitizeExportToken(value, fallback = "atelier") {
  const raw = String(value || "").trim().toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

export function buildGdprExportFilename({ slug, date = todayISO() } = {}) {
  const token = sanitizeExportToken(slug, "atelier");
  return `gdpr-export-${token}-${date}.json`;
}

export function summarizeGdprBundle(bundle) {
  const dosare = Array.isArray(bundle?.dosare) ? bundle.dosare.length : 0;
  const arhiva = Array.isArray(bundle?.arhiva) ? bundle.arhiva.length : 0;
  const membri = Array.isArray(bundle?.membri) ? bundle.membri.length : 0;
  const istoric = Array.isArray(bundle?.istoric) ? bundle.istoric.length : 0;
  return { dosare, arhiva, membri, istoric };
}

/** Trigger browser download for a JSON object */
export function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Admin-only RPC export of atelier personal/operational data.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function downloadAtelierGdprExport(supabase, atelierId, { slug } = {}) {
  if (!supabase) throw new Error("Supabase client lipsește.");
  if (!atelierId) throw new Error("Selectează un atelier activ.");

  const { data, error } = await supabase.rpc("export_atelier_gdpr_bundle", {
    p_atelier_id: atelierId,
  });
  if (error) throw new Error(error.message || "Export GDPR eșuat.");
  if (!data) throw new Error("Export gol — verifică migrarea 34.");

  const filename = buildGdprExportFilename({
    slug: slug || data?.atelier?.slug,
  });
  downloadJsonFile(data, filename);
  return { filename, summary: summarizeGdprBundle(data) };
}

/**
 * Admin wipe of all live claims for an atelier (archives + storage cleanup).
 */
export async function wipeAtelierDosare(supabase, atelierId, confirmSlug) {
  if (!supabase) throw new Error("Supabase client lipsește.");
  if (!atelierId) throw new Error("Selectează un atelier activ.");
  if (!String(confirmSlug || "").trim()) {
    throw new Error("Tastează slug-ul atelierului pentru confirmare.");
  }

  const { data, error } = await supabase.rpc("wipe_atelier_dosare", {
    p_atelier_id: atelierId,
    p_confirm_slug: String(confirmSlug).trim(),
  });
  if (error) throw new Error(error.message || "Ștergerea datelor a eșuat.");
  return data;
}
