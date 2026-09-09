import React, { useState, useMemo } from "react";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Wrench,
  Building,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  AlertCircle,
  Tag
} from "lucide-react";
import { uid } from "../../utils/dateUtils";

export const PART_STATUSES = [
  { id: "necomandat", label: "Necomandat", color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300" },
  { id: "cerere_oferta", label: "Cerere ofertă", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300" },
  { id: "comandat", label: "Comandat", color: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300" },
  { id: "in_tranzit", label: "În tranzit / Curier", color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300" },
  { id: "sosit", label: "Sosit în atelier", color: "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300" },
  { id: "montat", label: "Montat pe auto", color: "bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300" },
  { id: "retur", label: "Retur / Neconform", color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300" },
];

export const COMMON_SUPPLIERS = [
  "Unix Auto",
  "Autonet",
  "Inter Cars",
  "Augsburg",
  "Bardi Auto",
  "Reprezentanta OE",
  "Dezmembrari / SH",
];

export default function PartsLifecyclePanel({
  form,
  set,
  readOnly = false,
  onNotify,
}) {
  const [isOpen, setIsOpen] = useState(true);

  // Extrage piesele fie din form.operatiuni (cele cu bifa INL = Înlocuire), fie din lista dedicată
  const operations = Array.isArray(form.operatiuni) ? form.operatiuni : [];
  const replacementOps = useMemo(() => {
    return operations.filter((o) => o && (o.inl || o.statusPiesa || o.furnizor || o.pretAchizitie));
  }, [operations]);

  // Sincronizare automată a valorii totale de achiziție în formular
  const totalAchizitieCalculat = useMemo(() => {
    return operations.reduce((sum, op) => sum + (Number(op.pretAchizitie) || 0), 0);
  }, [operations]);

  const allPartsArrived = useMemo(() => {
    if (replacementOps.length === 0) return false;
    return replacementOps.every((op) => op.statusPiesa === "sosit" || op.statusPiesa === "montat");
  }, [replacementOps]);

  const handleUpdatePart = (idx, field, val) => {
    const updated = [...operations];
    // Găsim indexul real în lista operations
    const opTarget = replacementOps[idx];
    const realIndex = operations.findIndex((o) => o === opTarget || (o.id && o.id === opTarget.id));
    if (realIndex >= 0) {
      updated[realIndex] = { ...updated[realIndex], [field]: val };
      set("operatiuni", updated);

      // Dacă s-a actualizat prețul, actualizăm și valoarea generală de achiziție dacă utilizatorul dorește
      if (field === "pretAchizitie") {
        const newTotal = updated.reduce((acc, o) => acc + (Number(o.pretAchizitie) || 0), 0);
        if (newTotal > 0) {
          set("valoareAchizitiePiese", newTotal);
        }
      }
    }
  };

  const handleMarkAllArrived = () => {
    const updated = operations.map((op) => {
      if (op.inl || op.statusPiesa) {
        return { ...op, statusPiesa: "sosit" };
      }
      return op;
    });
    set("operatiuni", updated);
    set("pieseSosite", true);
    onNotify?.("Toate piesele de înlocuire au fost marcate ca 'Sosite în atelier'!", "success");
  };

  const handleAddCustomPart = () => {
    const newItem = {
      id: uid(),
      piesa: "",
      inl: true,
      rev: false,
      rep: false,
      uni: false,
      statusPiesa: "comandat",
      furnizor: "Autonet",
      codPiesa: "",
      pretAchizitie: 0,
    };
    const updated = [...operations, newItem];
    set("operatiuni", updated);
  };

  const handleRemovePart = (idx) => {
    const updated = [...operations];
    const opTarget = replacementOps[idx];
    const realIndex = operations.findIndex((o) => o === opTarget || (o.id && o.id === opTarget.id));
    if (realIndex >= 0) {
      const op = updated[realIndex];
      if (!op.rep && !op.rev && !op.uni) {
        updated.splice(realIndex, 1);
      } else {
        updated[realIndex] = {
          ...op,
          inl: false,
          statusPiesa: null,
          furnizor: "",
          codPiesa: "",
          pretAchizitie: 0,
          awb: "",
        };
      }
      set("operatiuni", updated);
      onNotify?.("Piesa a fost eliminată din lista comenzilor.", "info");
    }
  };

  if (replacementOps.length === 0) {
    return (
      <div className="bg-[var(--app-surface)] border border-[var(--app-border)]/80 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-[var(--app-muted)]">
            <Package size={13} className="text-amber-600" />
            <span>Ciclu de Viață Piese (Comenzi &amp; Livrări)</span>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={handleAddCustomPart}
              className="text-[10px] font-bold text-amber-700 hover:text-amber-800 dark:text-amber-300 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900 cursor-pointer"
            >
              <Plus size={11} /> Adaugă piesă de comandat
            </button>
          )}
        </div>
        <p className="text-[10.5px] text-[var(--app-muted)] italic">
          Bifează „INL” (Înlocuire) pe oricare reper de mai sus pentru a urmări comanda, furnizorul și termenul de livrare.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-surface)] border border-amber-300/60 dark:border-amber-900/60 rounded-xl overflow-hidden shadow-2xs space-y-0">
      {/* Header Panel */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-transparent dark:from-amber-950/30 dark:via-amber-950/10 border-b border-amber-200/70 dark:border-amber-900/50">
        <div className="flex items-center gap-2">
          <Package size={14} className="text-amber-600 dark:text-amber-400" />
          <span className="text-[11.5px] font-extrabold text-[var(--app-text-strong)] uppercase tracking-wide">
            Gestiune &amp; Livrare Piese ({replacementOps.length} {replacementOps.length === 1 ? "reper" : "repere"})
          </span>
          {allPartsArrived ? (
            <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
              <CheckCircle2 size={10} /> Toate sosite
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
              <Clock size={10} /> În așteptare livrare
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!readOnly && !allPartsArrived && (
            <button
              type="button"
              onClick={handleMarkAllArrived}
              className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="Marchează toate piesele ca fiind sosite în atelier"
            >
              <CheckCircle2 size={11} /> Toate sosite
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-[var(--app-muted)] hover:text-[var(--app-text)] rounded transition-colors"
          >
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Tabel piese */}
      {isOpen && (
        <div className="p-2 space-y-2">
          <div className="divide-y divide-[var(--app-border)]/50 border border-[var(--app-border)]/60 rounded-lg overflow-hidden bg-[var(--app-surface-2)]/30">
            {replacementOps.map((op, idx) => {
              const currentStatus = op.statusPiesa || (form.pieseSosite ? "sosit" : form.dataComandaPiese ? "comandat" : "necomandat");
              return (
                <div key={op.id || idx} className="p-2 space-y-1.5 hover:bg-[var(--app-surface-2)]/50 transition-colors">
                  {/* Linia 1: Denumire + Status */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                      <span className="text-[10px] font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-1 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={op.piesa || ""}
                        disabled={readOnly}
                        onChange={(e) => handleUpdatePart(idx, "piesa", e.target.value.toUpperCase())}
                        placeholder="Denumire piesă..."
                        className="text-[11px] font-extrabold uppercase bg-transparent border-b border-transparent focus:border-[var(--app-accent)] focus:bg-[var(--app-surface)] px-1 py-0.5 rounded text-[var(--app-text-strong)] flex-1 min-w-[120px]"
                      />
                    </div>

                    {/* Selector Status Piesă */}
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={currentStatus}
                        disabled={readOnly}
                        onChange={(e) => handleUpdatePart(idx, "statusPiesa", e.target.value)}
                        className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-lg border cursor-pointer focus:outline-none ${
                          PART_STATUSES.find((s) => s.id === currentStatus)?.color || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {PART_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemovePart(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 rounded transition-colors cursor-pointer"
                          title="Elimină piesa din comenzi"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Linia 2: Furnizor, Cod Piesă, Cost Achiziție */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5 text-[10px]">
                    <div>
                      <span className="text-[9.5px] text-[var(--app-muted)] font-semibold flex items-center gap-0.5 mb-0.5">
                        <Building size={10} /> Furnizor
                      </span>
                      <input
                        type="text"
                        list={`suppliers-${idx}`}
                        value={op.furnizor || ""}
                        disabled={readOnly}
                        onChange={(e) => handleUpdatePart(idx, "furnizor", e.target.value)}
                        placeholder="ex: Autonet, Unix"
                        className="w-full text-[10.5px] font-semibold bg-[var(--app-surface)] border border-[var(--app-border)]/70 rounded px-1.5 py-0.5 text-[var(--app-text)]"
                      />
                      <datalist id={`suppliers-${idx}`}>
                        {COMMON_SUPPLIERS.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[var(--app-muted)] font-semibold flex items-center gap-0.5 mb-0.5">
                        <Tag size={10} /> Cod piesă / OE
                      </span>
                      <input
                        type="text"
                        value={op.codPiesa || ""}
                        disabled={readOnly}
                        onChange={(e) => handleUpdatePart(idx, "codPiesa", e.target.value.toUpperCase())}
                        placeholder="ex: 5G0807217"
                        className="w-full font-mono text-[10.5px] font-bold bg-[var(--app-surface)] border border-[var(--app-border)]/70 rounded px-1.5 py-0.5 text-[var(--app-text)] uppercase"
                      />
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[var(--app-muted)] font-semibold flex items-center gap-0.5 mb-0.5">
                        <DollarSign size={10} /> Preț achiziție (lei)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={op.pretAchizitie || ""}
                        disabled={readOnly}
                        onChange={(e) => handleUpdatePart(idx, "pretAchizitie", Number(e.target.value) || 0)}
                        placeholder="0 lei"
                        className="w-full font-mono text-[10.5px] font-bold bg-[var(--app-surface)] border border-[var(--app-border)]/70 rounded px-1.5 py-0.5 text-[var(--app-danger)]"
                      />
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[var(--app-muted)] font-semibold flex items-center gap-0.5 mb-0.5">
                        <Truck size={10} /> AWB / Notă
                      </span>
                      <input
                        type="text"
                        value={op.awb || ""}
                        disabled={readOnly}
                        onChange={(e) => handleUpdatePart(idx, "awb", e.target.value)}
                        placeholder="AWB curier / notă"
                        className="w-full text-[10.5px] bg-[var(--app-surface)] border border-[var(--app-border)]/70 rounded px-1.5 py-0.5 text-[var(--app-text)]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sumar Financiar & Buton Adăugare */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 px-1 text-[11px]">
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddCustomPart}
                className="text-[10.5px] font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> + Adaugă alt reper de comandat
              </button>
            )}

            {totalAchizitieCalculat > 0 && (
              <div className="text-[11px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5 ml-auto">
                <span className="text-[var(--app-muted)] font-normal">Total achiziții piese:</span>
                <span className="font-mono text-red-600 dark:text-red-400 font-extrabold">
                  {totalAchizitieCalculat.toLocaleString("ro-RO")} lei
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
