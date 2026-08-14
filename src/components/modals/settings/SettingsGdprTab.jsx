import React from "react";
import { Scale, Download, Trash2 } from "lucide-react";

export default function SettingsGdprTab({
  isAdmin = false,
  atelierId = null,
  atelierSlug = null,
  gdprExporting = false,
  handleGdprExport,
  wipeSlugConfirm = "",
  setWipeSlugConfirm,
  wipeBusy = false,
  handleWipeAtelier,
}) {
  const isSlugConfirmed =
    Boolean(atelierSlug) &&
    wipeSlugConfirm.trim().toLowerCase() === String(atelierSlug).toLowerCase();

  return (
    <div className="space-y-4">
      {/* Date & confidențialitate info */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-[14px] text-[var(--app-text-strong)] border-b border-[var(--app-border)] pb-2 flex items-center gap-2">
          <Scale size={16} className="text-[var(--app-muted)]" /> Date &amp; confidențialitate
        </h3>
        <p className="text-[12px] text-[var(--app-muted)] leading-relaxed">
          Atelierul tău este operatorul datelor din dosare (clienți, contacte, documente).
          Workflow Dosare procesează datele ca furnizor tehnic. Exportă periodic o copie și șterge ce nu mai ai temei să păstrezi.
        </p>
        <ul className="text-[11.5px] text-[var(--app-muted)] list-disc pl-4 space-y-1">
          <li>Export GDPR: atelier, membri, dosare active, arhivă, istoric (fără chei Stripe).</li>
          <li>Eliminarea unui membru din Cont scoate accesul; contul Auth poate rămâne.</li>
          <li>Ștergerea unui dosar arhivează rândul și curăță pozele/documentele din Storage (migrare 34).</li>
        </ul>
      </div>

      {/* Export GDPR */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3">
        <h4 className="font-bold text-[13px] text-[var(--app-text-strong)]">Export date atelier (GDPR)</h4>
        <p className="text-[11.5px] text-[var(--app-muted)]">
          Descarcă pachetul JSON complet pentru atelierul activ
          {atelierSlug ? ` (${atelierSlug})` : ""}. Doar administrator.
        </p>
        <button
          type="button"
          onClick={handleGdprExport}
          disabled={!isAdmin || !atelierId || gdprExporting}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--app-accent)] text-white text-[12.5px] font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Download size={15} />
          {gdprExporting ? "Se exportă…" : "Descarcă export GDPR (.json)"}
        </button>
        {!atelierId && (
          <p className="text-[11px] text-[var(--app-warning,#b45309)]">
            Nu există atelier activ — reîncarcă pagina după login.
          </p>
        )}
      </div>

      {/* Wipe Atelier */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-danger)]/30 rounded-xl p-4 space-y-3">
        <h4 className="font-bold text-[13px] text-[var(--app-danger)]">Șterge toate dosarele atelierului</h4>
        <p className="text-[11.5px] text-[var(--app-muted)] leading-relaxed">
          Mută dosarele active în arhivă, le elimină din flux și curăță fișierele din Storage.
          Membrii, branding-ul și abonamentul rămân. Irreversibil din UI.
        </p>
        <label className="block text-[11px] font-bold text-[var(--app-muted)] uppercase tracking-wide">
          Tastează slug-ul pentru confirmare
          {atelierSlug ? `: ${atelierSlug}` : ""}
        </label>
        <input
          type="text"
          value={wipeSlugConfirm}
          onChange={(e) => setWipeSlugConfirm(e.target.value)}
          disabled={!isAdmin || !atelierId || wipeBusy}
          placeholder={atelierSlug || "slug-atelier"}
          className="w-full px-3 py-2 rounded-lg border border-[var(--app-border)] text-[13px] bg-[var(--app-surface-2)]"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleWipeAtelier}
          disabled={!isAdmin || !atelierId || wipeBusy || !isSlugConfirmed}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--app-danger)] text-white text-[12.5px] font-bold rounded-lg disabled:opacity-40"
        >
          <Trash2 size={15} />
          {wipeBusy ? "Se șterge…" : "Șterge toate dosarele"}
        </button>
      </div>
    </div>
  );
}
