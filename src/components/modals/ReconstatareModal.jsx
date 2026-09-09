import React, { useState, useMemo } from "react";
import {
  X,
  ClipboardList,
  FileDown,
  Car,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ShieldCheck,
  MessageCircle,
  ImageIcon,
  Loader2,
  CheckCircle2,
  Tag,
  AlertTriangle
} from "lucide-react";
import { CAR_PANELS } from "../common/CarDamageVisualSelector";
import { generateCerereReconstatarePdf } from "../../utils/generateCerereReconstatarePdf";
import { todayISO, waLink } from "../../utils/dateUtils";
import { loadCachedBranding } from "../../constants/branding";

export default function ReconstatareModal({
  isOpen,
  onClose,
  claim,
  onPatchClaim,
  onNotify,
}) {
  if (!isOpen || !claim) return null;

  const branding = loadCachedBranding() || {};
  const [inspectorDauna, setInspectorDauna] = useState(() => claim.inspectorDauna || "");
  const [nrDosarAsigurator, setNrDosarAsigurator] = useState(() => claim.nrDosarAsigurator || claim.numarDosar || "");
  const [telefonInspector, setTelefonInspector] = useState("");
  const [dataCerere, setDataCerere] = useState(() => todayISO());
  const [modDesfasurare, setModDesfasurare] = useState("Fizic la atelier"); // "Fizic la atelier" | "Online / Plansa foto"
  const [intervalOrar, setIntervalOrar] = useState("09:00 - 17:00");
  const [motivatie, setMotivatie] = useState(
    "In urma dezechiparii si demontarii reperelor exterioare avariate au fost identificate elemente de caroserie deformate, prinderi rupte si daune ascunse necuprinse in nota initiala de constatare."
  );

  // Inițializăm reperele de reconstatat din operațiunile existente sau avarii
  const [repere, setRepere] = useState(() => {
    const existing = Array.isArray(claim.operatiuni) ? claim.operatiuni : [];
    if (existing.length > 0) {
      return existing.map((op, idx) => ({
        id: op.id || String(idx + 1),
        piesa: op.piesa || "",
        operatiune: op.inl ? "INL (Inlocuire)" : op.rep ? "REP (Reparatie)" : op.rev ? "REV (Revopsire)" : "INL / D/R",
        descriere: "Element avariat descoperit la dezechipare",
      }));
    }
    return [
      {
        id: "1",
        piesa: "Armatura bara / Suporti interiori",
        operatiune: "INL (Inlocuire)",
        descriere: "Fisurat / deformat in spatele barii exterioare",
      },
    ];
  });

  const [generating, setGenerating] = useState(false);

  // Numărul de fotografii existente în dosar (în special cele din categoria reconstatare)
  const reconstatarePoze = useMemo(() => {
    const all = Array.isArray(claim.poze) ? claim.poze : [];
    return all.filter((p) => p && (p.categoria === "reconstatare" || p.categoria === "generale"));
  }, [claim.poze]);

  const handleAddRow = () => {
    setRepere((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        piesa: "",
        operatiune: "INL (Inlocuire)",
        descriere: "Deformat / rupt interior",
      },
    ]);
  };

  const handleRemoveRow = (id) => {
    setRepere((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRow = (id, field, val) => {
    setRepere((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleQuickAddPanel = (panelName) => {
    if (!panelName) return;
    setRepere((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        piesa: panelName.toUpperCase(),
        operatiune: "INL (Inlocuire)",
        descriere: "Avariat interior / ghidaje rupte",
      },
    ]);
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const dataPayload = {
        inspectorDauna,
        nrDosarAsigurator,
        dataCerere,
        mod: modDesfasurare,
        dataOra: intervalOrar,
        motivatie,
        repere: repere.filter((r) => String(r.piesa || "").trim().length > 0),
        pozeCount: reconstatarePoze.length,
      };

      await generateCerereReconstatarePdf({
        claim: {
          ...claim,
          nrDosarAsigurator: nrDosarAsigurator || claim.nrDosarAsigurator,
          inspectorDauna: inspectorDauna || claim.inspectorDauna,
        },
        reconstatareData: dataPayload,
        atelierBranding: branding,
      });

      // Salvăm opțional datele de inspector/dosar în claim dacă s-au completat
      if (onPatchClaim && (inspectorDauna !== claim.inspectorDauna || nrDosarAsigurator !== claim.nrDosarAsigurator)) {
        onPatchClaim({
          inspectorDauna: inspectorDauna || claim.inspectorDauna,
          nrDosarAsigurator: nrDosarAsigurator || claim.nrDosarAsigurator,
        });
      }

      onNotify?.("Cererea de reconstatare a fost generată și descărcată cu succes!", "success");
    } catch (err) {
      console.error(err);
      onNotify?.("Eroare la generarea PDF: " + (err.message || err), "error");
    } finally {
      setGenerating(false);
    }
  };

  const waMessage = `Buna ziua! Referitor la dosarul ${claim.numarDosar || ""} / ${claim.numarInmatriculare || ""} (${claim.asigurator || "asigurare"}), va solicitam o reconstatare pentru daune ascunse identificate dupa dezechipare. Autovehiculul este disponibil la ${branding?.atelierNume || "service"}. Va rugam sa ne comunicati data inspectiei. Va multumim!`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-[v2-fade-in_0.2s_ease]">
      <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-[v2-scale-in_0.2s_ease]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)] bg-[var(--app-surface-2)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
              <ClipboardList size={18} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[var(--app-text-strong)] flex items-center gap-1.5">
                Cerere &amp; Notă de Reconstatare Daune
                <span className="text-[10.5px] font-mono font-bold bg-[var(--app-accent)]/15 text-[var(--app-accent)] px-1.5 py-0.5 rounded">
                  {claim.numarInmatriculare || claim.numarDosar}
                </span>
              </h2>
              <p className="text-[11px] text-[var(--app-muted)]">
                Generează avizul oficial pentru asigurator cu piesele și deformările ascunse descoperite la demontare.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto text-[12px]">
          {/* Card Asigurator & Inspector */}
          <div className="grid sm:grid-cols-3 gap-3 bg-[var(--app-surface-2)]/60 border border-[var(--app-border)]/80 rounded-xl p-3">
            <div>
              <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-1 flex items-center gap-1">
                <ShieldCheck size={12} /> Asigurător Daună
              </label>
              <input
                type="text"
                readOnly
                value={claim.asigurator || "Nespecificat"}
                className="w-full text-[11.5px] font-semibold bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text-strong)]"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-1">
                Nr. Dosar Asigurator
              </label>
              <input
                type="text"
                value={nrDosarAsigurator}
                onChange={(e) => setNrDosarAsigurator(e.target.value)}
                placeholder="ex: 90218412"
                className="w-full text-[11.5px] font-mono font-semibold bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] focus:border-[var(--app-accent)]"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-1">
                Nume Inspector / Constatator
              </label>
              <input
                type="text"
                value={inspectorDauna}
                onChange={(e) => setInspectorDauna(e.target.value)}
                placeholder="ex: Popescu Ion"
                className="w-full text-[11.5px] font-semibold bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg px-2.5 py-1.5 text-[var(--app-text)] focus:border-[var(--app-accent)]"
              />
            </div>
          </div>

          {/* Justificare Tehnica */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--app-text-strong)] mb-1 flex items-center gap-1">
              <AlertTriangle size={13} className="text-amber-600" /> Motivație Tehnică (constatare la dezechipare)
            </label>
            <textarea
              rows={2}
              value={motivatie}
              onChange={(e) => setMotivatie(e.target.value)}
              className="w-full text-[11.5px] p-2 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg text-[var(--app-text)] focus:border-[var(--app-accent)] leading-relaxed"
              placeholder="Descrie cum au fost identificate noile avarii..."
            />
          </div>

          {/* Repere & Piese de Reconstatat */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-extrabold text-[var(--app-text-strong)] uppercase tracking-wide">
                Repere Suplimentare de Reconstatat ({repere.length})
              </span>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    handleQuickAddPanel(e.target.value);
                    e.target.value = "";
                  }}
                  defaultValue=""
                  className="text-[10.5px] font-medium bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded px-2 py-1 text-[var(--app-muted)]"
                >
                  <option value="" disabled>+ Adaugă reper caroserie...</option>
                  {CAR_PANELS.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="text-[10.5px] font-extrabold px-2 py-1 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Linie liberă
                </button>
              </div>
            </div>

            <div className="border border-[var(--app-border)] rounded-xl overflow-hidden shadow-2xs">
              <div className="grid grid-cols-12 gap-1 bg-[var(--app-surface-2)] px-2.5 py-1.5 text-[10px] font-extrabold uppercase text-[var(--app-muted)] border-b border-[var(--app-border)]">
                <div className="col-span-5">Piesă / Reper solicitat</div>
                <div className="col-span-3">Operațiune</div>
                <div className="col-span-3">Justificare avarie</div>
                <div className="col-span-1 text-center">Șterge</div>
              </div>

              <div className="divide-y divide-[var(--app-border)]/60 max-h-48 overflow-y-auto bg-[var(--app-surface)]">
                {repere.length === 0 ? (
                  <div className="p-3 text-center text-[11px] text-[var(--app-muted)] italic">
                    Niciun reper adăugat. Apasă pe „+ Linie liberă” sau alege din meniul de repere.
                  </div>
                ) : (
                  repere.map((r, idx) => (
                    <div key={r.id || idx} className="grid grid-cols-12 gap-1 items-center px-2 py-1.5">
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={r.piesa}
                          onChange={(e) => handleUpdateRow(r.id, "piesa", e.target.value.toUpperCase())}
                          placeholder="ex: ARMATURA BARA FATA"
                          className="w-full text-[11px] font-bold p-1 bg-[var(--app-surface-2)]/60 border border-[var(--app-border)]/80 rounded uppercase text-[var(--app-text-strong)]"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={r.operatiune}
                          onChange={(e) => handleUpdateRow(r.id, "operatiune", e.target.value)}
                          className="w-full text-[10.5px] font-bold p-1 bg-[var(--app-surface-2)]/60 border border-[var(--app-border)]/80 rounded text-red-700 dark:text-red-400"
                        >
                          <option value="INL (Inlocuire)">INL (Înlocuire)</option>
                          <option value="REP (Reparatie)">REP (Reparație)</option>
                          <option value="REV (Revopsire)">REV (Revopsire)</option>
                          <option value="D/R (Demontat/Remontat)">D/R (Demontat/Remontat)</option>
                          <option value="INL + REV">INL + REV</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={r.descriere}
                          onChange={(e) => handleUpdateRow(r.id, "descriere", e.target.value)}
                          placeholder="ex: Urechi rupte, deformat"
                          className="w-full text-[10.5px] p-1 bg-[var(--app-surface-2)]/60 border border-[var(--app-border)]/80 rounded text-[var(--app-text)]"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(r.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Desfășurare Reconstatare & Planșă foto */}
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-[var(--app-surface-2)]/40 border border-[var(--app-border)] rounded-xl p-3 space-y-2">
              <span className="text-[11px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
                <Calendar size={13} className="text-[var(--app-accent)]" /> Modalitate &amp; Interval
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--app-muted)] mb-0.5">Mod inspecție:</label>
                  <select
                    value={modDesfasurare}
                    onChange={(e) => setModDesfasurare(e.target.value)}
                    className="w-full text-[11px] p-1.5 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg text-[var(--app-text)] font-semibold"
                  >
                    <option value="Fizic la atelier">Fizic la atelier</option>
                    <option value="Online pe baza foto">Online pe baza foto</option>
                    <option value="Apel video / Live">Apel video / Live</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--app-muted)] mb-0.5">Interval orar:</label>
                  <input
                    type="text"
                    value={intervalOrar}
                    onChange={(e) => setIntervalOrar(e.target.value)}
                    className="w-full text-[11px] p-1.5 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-lg text-[var(--app-text)] font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[var(--app-surface-2)]/40 border border-[var(--app-border)] rounded-xl p-3 space-y-1">
              <span className="text-[11px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5">
                <ImageIcon size={13} className="text-sky-600" /> Planșă Foto din Dosar
              </span>
              <p className="text-[10.5px] text-[var(--app-muted)] leading-relaxed">
                {reconstatarePoze.length > 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> {reconstatarePoze.length} fotografii disponibile în dosar
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">
                    Nu există fotografii salvate la secțiunea „Reconstatare” în dosar. Le poți adăuga din tab-ul Media.
                  </span>
                )}
              </p>
              <div className="text-[10px] text-[var(--app-muted)]">
                Vehiculul este păstrat dezechipat în atelier până la efectuarea inspecției.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[var(--app-border)] bg-[var(--app-surface-2)] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <a
              href={waLink(telefonInspector, waMessage)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              title="Trimite solicitare rapidă pe WhatsApp inspectorului"
            >
              <MessageCircle size={13} /> Solicită pe WhatsApp
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-2)] text-[var(--app-text)] text-[11px] font-bold transition-colors cursor-pointer"
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[11.5px] font-extrabold shadow-sm transition-all cursor-pointer"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              <span>Generează &amp; Descarcă PDF Reconstatare</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
