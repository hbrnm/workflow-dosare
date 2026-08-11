import React, { useState, useCallback } from "react";
import { Download, X, CheckSquare, Square, FileSpreadsheet, FileText, Layers, Wallet, CalendarClock, Car, BarChart3 } from "lucide-react";
import { downloadWorkflowModules } from "../../utils/exportWorkflowModules";
import { countUniqueVehicles } from "../../utils/plateSchedule";
import { EXPORT_FORMAT } from "../../utils/exportClaimsList";
import { useModalEscape, overlayBackdropCloseProps } from "../../hooks/useModalEscape";

export default function ExportExcelModal({ claims = [], onClose }) {
  const [selectedModules, setSelectedModules] = useState({
    dosare: true,
    financiar: true,
    programari: true,
    masiniSchimb: true,
    statistici: true,
  });

  const handleClose = useCallback(() => onClose?.(), [onClose]);
  useModalEscape(handleClose);
  const backdropProps = overlayBackdropCloseProps(true, handleClose);

  const toggleModule = (key) => {
    setSelectedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setSelectedModules({
      dosare: true,
      financiar: true,
      programari: true,
      masiniSchimb: true,
      statistici: true,
    });
  };

  const deselectAll = () => {
    setSelectedModules({
      dosare: false,
      financiar: false,
      programari: false,
      masiniSchimb: false,
      statistici: false,
    });
  };

  const selectedCount = Object.values(selectedModules).filter(Boolean).length;

  const handleExport = async (format) => {
    if (selectedCount === 0) return;
    await downloadWorkflowModules(claims, selectedModules, format);
    onClose();
  };

  const moduleDefinitions = [
    {
      id: "dosare",
      title: "Modulul Dosare & Flux",
      desc: "Informații de bază: Nr. dosar, client, vehicul, VIN, status curent, asigurător.",
      icon: Layers,
      count: claims.length,
    },
    {
      id: "financiar",
      title: "Modulul Financiar & Decontare",
      desc: "Valori devize, decontat, manoperă facturată tinichigerie & vopsitorie, status piese.",
      icon: Wallet,
      count: claims.filter((c) => c.valoareDeviz || c.manopera?.tinichigerie?.facturat || c.manopera?.vopsitorie?.facturat).length,
    },
    {
      id: "programari",
      title: "Modulul Programări Atelier",
      desc: "Programări service, mecanici/vopsitori alocați, date estimative de livrare.",
      icon: CalendarClock,
      count: countUniqueVehicles(claims.filter((c) => c.dataProgramare)),
    },
    {
      id: "masiniSchimb",
      title: "Modulul Mașini la Schimb",
      desc: "Autovehicule de înlocuire, dată predare, zile chirie Audatex vs zile efective.",
      icon: Car,
      count: claims.filter((c) => c.masinaSchimb && c.masinaSchimb.trim()).length,
    },
    {
      id: "statistici",
      title: "Modulul Statistici & KPIs",
      desc: "Totaluri agregate pe fiecare asigurător, RCA vs CASCO, dosare blocate și devize.",
      icon: BarChart3,
      count: [...new Set(claims.map((c) => c.asigurator).filter(Boolean))].length + " asigurători",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      {...backdropProps}
    >
      <div
        className="bg-[var(--app-surface)] rounded-xl border border-[var(--app-border)] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[var(--app-surface-2)] text-[var(--app-text-strong)] px-5 py-4 flex items-center justify-between border-b border-[var(--app-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg app-accent-bg flex items-center justify-center font-bold">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-[16px] tracking-tight app-display">Export date</h2>
              <p className="text-[11.5px] text-[var(--app-muted)]">Alege modulele și formatul de export</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-muted)] transition-colors"
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selection Toolbar */}
        <div className="px-5 py-2.5 bg-[var(--app-surface-muted)] border-b border-[var(--app-border)] flex items-center justify-between text-[12px] font-semibold text-[var(--app-muted)]">
          <span>
            Module selectate:{" "}
            <strong className="text-[var(--app-accent)] font-bold">
              {selectedCount} din {moduleDefinitions.length}
            </strong>
          </span>
          <div className="flex gap-3">
            <button type="button" onClick={selectAll} className="text-[var(--app-text)] hover:underline">
              Selectează toate
            </button>
            <span className="text-[var(--app-border)]">|</span>
            <button type="button" onClick={deselectAll} className="text-[var(--app-danger)] hover:underline">
              Deselectează toate
            </button>
          </div>
        </div>

        {/* Modules List */}
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {moduleDefinitions.map(({ id, title, desc, icon: Icon, count }) => {
            const active = selectedModules[id];
            return (
              <div
                key={id}
                role="checkbox"
                aria-checked={active}
                onClick={() => toggleModule(id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                  active
                    ? "bg-[var(--app-surface-2)] border-[var(--app-accent)]"
                    : "bg-[var(--app-surface)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                }`}
              >
                <div className="mt-0.5 text-[var(--app-accent)]">
                  {active ? (
                    <CheckSquare size={19} className="text-[var(--app-accent)]" />
                  ) : (
                    <Square size={19} className="text-[var(--app-muted)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13.5px] font-semibold text-[var(--app-text-strong)] flex items-center gap-1.5">
                      <Icon size={15} className={active ? "text-[var(--app-accent)]" : "text-[var(--app-muted)]"} />
                      {title}
                    </span>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[var(--app-surface-muted)] text-[var(--app-muted)] shrink-0">
                      {count}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[var(--app-muted)] mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[var(--app-surface-2)] border-t border-[var(--app-border)] flex items-center justify-end gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-[var(--app-border)] text-[var(--app-text)] font-bold text-[13px] hover:bg-[var(--app-surface-muted)]"
          >
            Renunță
          </button>
          <button
            type="button"
            onClick={() => handleExport(EXPORT_FORMAT.PDF)}
            disabled={selectedCount === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[13px] transition-all ${
              selectedCount > 0
                ? "bg-[var(--app-surface-muted)] text-[var(--app-text-strong)] hover:bg-[var(--app-border)]"
                : "bg-[var(--app-surface-muted)] text-[var(--app-muted)] cursor-not-allowed opacity-50"
            }`}
          >
            <FileText size={16} />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport(EXPORT_FORMAT.XLSX)}
            disabled={selectedCount === 0}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-[13px] transition-all ${
              selectedCount > 0
                ? "app-accent-bg hover:bg-[var(--app-accent-hover)]"
                : "bg-[var(--app-surface-muted)] text-[var(--app-muted)] cursor-not-allowed opacity-50"
            }`}
          >
            <Download size={16} />
            <span>Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
