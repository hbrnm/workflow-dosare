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

  // Lista unică de operațiuni & piese
  const operations = Array.isArray(form?.operatiuni) ? form.operatiuni : [];

  // Repere marcate pentru înlocuire (au bifa INL sau au deja date de piesă / comandă)
  const replacementOps = useMemo(() => {
    return operations.filter(
      (o) => o && (o.inl || o.statusPiesa || o.furnizor || o.pretAchizitie)
    );
  }, [operations]);

  // Sincronizare automată a valorii totale de achiziție piese
  const totalAchizitieCalculat = useMemo(() => {
    return operations.reduce((sum, op) => sum + (Number(op.pretAchizitie) || 0), 0);
  }, [operations]);

  // Verificare dacă toate piesele de înlocuit au sosit în atelier
  const allPartsArrived = useMemo(() => {
    if (replacementOps.length === 0) return false;
    return replacementOps.every(
      (op) => op.statusPiesa === "sosit" || op.statusPiesa === "montat"
    );
  }, [replacementOps]);

  const handleUpdateOperation = (idx, field, val) => {
    const updated = [...operations];
    const target = { ...updated[idx], [field]: val };

    // Când se bifează INL (Înlocuire), setăm status implicit de comandă
    if (field === "inl" && val) {
      if (!target.statusPiesa) target.statusPiesa = "necomandat";
      if (!target.furnizor) target.furnizor = "Autonet";
    }

    updated[idx] = target;
    set("operatiuni", updated);

    // Actualizare string agregat ceEsteDeReparat
    if (field === "piesa") {
      set(
        "ceEsteDeReparat",
        updated
          .map((o) => o.piesa)
          .filter(Boolean)
          .join(", ")
      );
    }

    // Actualizare valoare totală achiziție piese
    if (field === "pretAchizitie") {
      const newTotal = updated.reduce((acc, o) => acc + (Number(o.pretAchizitie) || 0), 0);
      set("valoareAchizitiePiese", newTotal);
    }
  };

  const handleAddOperation = (isReplacement = false) => {
    const newItem = {
      id: uid(),
      piesa: "",
      inl: isReplacement,
      rev: false,
      rep: false,
      uni: false,
      ...(isReplacement
        ? {
            statusPiesa: "necomandat",
            furnizor: "Autonet",
            codPiesa: "",
            pretAchizitie: 0,
            awb: "",
          }
        : {}),
    };
    const updated = [...operations, newItem];
    set("operatiuni", updated);
  };

  const handleRemoveOperation = (idx) => {
    const updated = operations.filter((_, i) => i !== idx);
    set("operatiuni", updated);
    set(
      "ceEsteDeReparat",
      updated
        .map((o) => o.piesa)
        .filter(Boolean)
        .join(", ")
    );

    const newTotal = updated.reduce((acc, o) => acc + (Number(o.pretAchizitie) || 0), 0);
    set("valoareAchizitiePiese", newTotal);
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

  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl overflow-hidden shadow-2xs space-y-0">
      {/* Header Unificat Modul */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[var(--app-surface-2)] border-b border-[var(--app-border)]">
        <div className="flex items-center gap-2 min-w-0">
          <Wrench size={14} className="text-[var(--app-muted)] shrink-0" />
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--app-muted)] truncate">
            Operațiuni &amp; Gestiune Piese
          </span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--app-surface)] text-[var(--app-text-strong)] border border-[var(--app-border)] shrink-0">
            {operations.length} {operations.length === 1 ? "operațiune" : "operațiuni"}
          </span>
          {replacementOps.length > 0 && (
            <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
              {replacementOps.length} de înlocuit
            </span>
          )}
          {replacementOps.length > 0 && allPartsArrived && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
              <CheckCircle2 size={10} /> Toate sosite
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!readOnly && replacementOps.length > 0 && !allPartsArrived && (
            <button
              type="button"
              onClick={handleMarkAllArrived}
              className="text-[10px] font-bold bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Marchează toate piesele ca fiind sosite în atelier"
            >
              <CheckCircle2 size={11} /> Toate sosite
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={() => handleAddOperation(false)}
              className="text-[10px] font-bold text-[var(--app-text)] hover:text-[var(--app-text-strong)] flex items-center gap-1 bg-[var(--app-surface)] px-2 py-0.5 rounded border border-[var(--app-border)] hover:bg-[var(--app-surface-muted)] cursor-pointer transition-colors"
            >
              <Plus size={11} /> Adaugă reper
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-[var(--app-muted)] hover:text-[var(--app-text)] rounded transition-colors cursor-pointer"
            title={isOpen ? "Restrânge panoul" : "Extinde panoul"}
          >
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Corpul Listei Unificate */}
      {isOpen && (
        <div className="p-2 space-y-2">
          {operations.length === 0 ? (
            <div className="text-[11px] text-[var(--app-muted)] italic p-4 border border-dashed border-[var(--app-border)] rounded-xl text-center space-y-2">
              <p>Nicio operațiune adăugată încă pe acest dosar.</p>
              {!readOnly && (
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddOperation(false)}
                    className="text-[10.5px] font-bold text-[var(--app-accent)] hover:underline flex items-center gap-1"
                  >
                    <Plus size={12} /> + Adaugă lucrare / reparație
                  </button>
                  <span className="text-[var(--app-border-strong)]">|</span>
                  <button
                    type="button"
                    onClick={() => handleAddOperation(true)}
                    className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Package size={12} /> + Adaugă piesă de schimb
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {operations.map((op, idx) => {
                const currentStatus =
                  op.statusPiesa ||
                  (form?.pieseSosite
                    ? "sosit"
                    : form?.dataComandaPiese
                      ? "comandat"
                      : "necomandat");

                return (
                  <div
                    key={op.id || idx}
                    className={`p-1.5 rounded-xl border transition-all ${
                      op.inl
                        ? "bg-[var(--app-surface)] border-amber-500/30 shadow-2xs"
                        : "bg-[var(--app-surface)] border-[var(--app-border)] hover:border-[var(--app-border-strong)]"
                    }`}
                  >
                    {/* Linia 1: Denumire piesă / lucrare + Bife operațiuni + Status Piesă + Ștergere */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                        <span className="text-[10px] font-mono font-bold text-[var(--app-muted)] bg-[var(--app-surface-2)] border border-[var(--app-border)] px-1.5 py-0.5 rounded shrink-0">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={op.piesa || ""}
                          disabled={readOnly}
                          onChange={(e) =>
                            handleUpdateOperation(idx, "piesa", e.target.value.toUpperCase())
                          }
                          placeholder="ex: Bară față, Far stânga, Aripă..."
                          className="flex-1 font-semibold text-[11.5px] px-2 py-0.5 border border-[var(--app-border)] rounded-md uppercase text-[var(--app-text-strong)] bg-[var(--app-surface)] focus:border-[var(--app-accent)] focus:outline-none"
                        />
                      </div>

                      {/* Bife operațiuni (INL, REV, REP, D/R) */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <label
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold cursor-pointer transition-all border flex items-center gap-1 ${
                            op.inl
                              ? "bg-[#B8791E] text-white border-[#B8791E] shadow-2xs"
                              : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]"
                          }`}
                          title="Bifează dacă este piesă de schimb ce trebuie înlocuită / comandată"
                        >
                          <input
                            type="checkbox"
                            checked={!!op.inl}
                            disabled={readOnly}
                            onChange={(e) => handleUpdateOperation(idx, "inl", e.target.checked)}
                            className="hidden"
                          />
                          <Package size={10} className={op.inl ? "text-white" : "text-[var(--app-muted)]"} />
                          INL
                        </label>

                        <label
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold cursor-pointer transition-all border ${
                            op.rev
                              ? "bg-[var(--app-muted)] text-white border-[var(--app-muted)]"
                              : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]"
                          }`}
                          title="Revopsire"
                        >
                          <input
                            type="checkbox"
                            checked={!!op.rev}
                            disabled={readOnly}
                            onChange={(e) => handleUpdateOperation(idx, "rev", e.target.checked)}
                            className="hidden"
                          />
                          REV
                        </label>

                        <label
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold cursor-pointer transition-all border ${
                            op.rep
                              ? "bg-[var(--app-success)] text-white border-[var(--app-success)]"
                              : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]"
                          }`}
                          title="Reparație"
                        >
                          <input
                            type="checkbox"
                            checked={!!op.rep}
                            disabled={readOnly}
                            onChange={(e) => handleUpdateOperation(idx, "rep", e.target.checked)}
                            className="hidden"
                          />
                          REP
                        </label>

                        <label
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold cursor-pointer transition-all border ${
                            op.uni
                              ? "bg-[var(--app-text)] text-white border-[var(--app-text)]"
                              : "bg-[var(--app-surface-2)] text-[var(--app-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface-muted)]"
                          }`}
                          title="Demontare / Remontare (D/R)"
                        >
                          <input
                            type="checkbox"
                            checked={!!op.uni}
                            disabled={readOnly}
                            onChange={(e) => handleUpdateOperation(idx, "uni", e.target.checked)}
                            className="hidden"
                          />
                          D/R
                        </label>

                        {/* Dacă INL este bifat, afișăm selectorul de Status Piesă direct pe linie */}
                        {op.inl && (
                          <select
                            value={currentStatus}
                            disabled={readOnly}
                            onChange={(e) => handleUpdateOperation(idx, "statusPiesa", e.target.value)}
                            className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md border cursor-pointer focus:outline-none ml-1 ${
                              PART_STATUSES.find((s) => s.id === currentStatus)?.color ||
                              "bg-slate-100 text-slate-700"
                            }`}
                            title="Status comandă piesă"
                          >
                            {PART_STATUSES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOperation(idx)}
                            className="p-1 text-[var(--app-danger)] hover:bg-red-500/10 rounded-md transition-colors ml-0.5 cursor-pointer"
                            title="Șterge operațiunea"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Linia 2: Detalii Comandă Piesă (apare AUTOMAT doar când INL este bifat) */}
                    {op.inl && (
                      <div className="p-2 mt-1 rounded-lg bg-[var(--app-surface-2)] border border-[var(--app-border)]/70 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] animate-in fade-in duration-150">
                        <div>
                          <span className="text-[9.5px] text-[var(--app-muted)] font-bold flex items-center gap-1 mb-0.5">
                            <Building size={10} className="text-[var(--app-muted)]" /> Furnizor
                          </span>
                          <input
                            type="text"
                            list={`suppliers-${idx}`}
                            value={op.furnizor || ""}
                            disabled={readOnly}
                            onChange={(e) => handleUpdateOperation(idx, "furnizor", e.target.value)}
                            placeholder="ex: Autonet, Unix"
                            className="w-full text-[10.5px] font-semibold bg-[var(--app-surface)] border border-[var(--app-border)] rounded px-1.5 py-0.5 text-[var(--app-text)]"
                          />
                          <datalist id={`suppliers-${idx}`}>
                            {COMMON_SUPPLIERS.map((s) => (
                              <option key={s} value={s} />
                            ))}
                          </datalist>
                        </div>

                        <div>
                          <span className="text-[9.5px] text-[var(--app-muted)] font-bold flex items-center gap-1 mb-0.5">
                            <Tag size={10} className="text-[var(--app-muted)]" /> Cod piesă / OE
                          </span>
                          <input
                            type="text"
                            value={op.codPiesa || ""}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleUpdateOperation(idx, "codPiesa", e.target.value.toUpperCase())
                            }
                            placeholder="Cod OE..."
                            className="w-full font-mono text-[10.5px] font-bold bg-[var(--app-surface)] border border-[var(--app-border)] rounded px-1.5 py-0.5 text-[var(--app-text)] uppercase"
                          />
                        </div>

                        <div>
                          <span className="text-[9.5px] text-[var(--app-muted)] font-bold flex items-center gap-1 mb-0.5">
                            <DollarSign size={10} className="text-[var(--app-danger)]" /> Preț achiziție (lei)
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            value={op.pretAchizitie || ""}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleUpdateOperation(
                                idx,
                                "pretAchizitie",
                                Number(e.target.value) || 0
                              )
                            }
                            placeholder="0 lei"
                            className="w-full font-mono text-[10.5px] font-bold bg-[var(--app-surface)] border border-[var(--app-border)] rounded px-1.5 py-0.5 text-[var(--app-danger)]"
                          />
                        </div>

                        <div>
                          <span className="text-[9.5px] text-[var(--app-muted)] font-bold flex items-center gap-1 mb-0.5">
                            <Truck size={10} className="text-[var(--app-muted)]" /> AWB / Notă
                          </span>
                          <input
                            type="text"
                            value={op.awb || ""}
                            disabled={readOnly}
                            onChange={(e) => handleUpdateOperation(idx, "awb", e.target.value)}
                            placeholder="AWB curier..."
                            className="w-full text-[10.5px] bg-[var(--app-surface)] border border-[var(--app-border)] rounded px-1.5 py-0.5 text-[var(--app-text)]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Subsol Modul: Butoane Adăugare & Total Achiziție */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 px-0.5 text-[11px] border-t border-[var(--app-border)]/50">
            {!readOnly && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddOperation(false)}
                  className="text-[10px] font-bold text-[var(--app-text)] hover:text-[var(--app-accent)] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus size={11} /> + Adaugă reper / lucrare
                </button>
                <span className="text-[var(--app-border)]">•</span>
                <button
                  type="button"
                  onClick={() => handleAddOperation(true)}
                  className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Package size={11} /> + Adaugă piesă de comandat
                </button>
              </div>
            )}

            {totalAchizitieCalculat > 0 && (
              <div className="text-[11px] font-bold text-[var(--app-text-strong)] flex items-center gap-1.5 ml-auto">
                <span className="text-[var(--app-muted)] font-normal text-[10.5px]">
                  Total achiziții piese:
                </span>
                <span className="font-mono text-[var(--app-danger)] font-extrabold">
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
