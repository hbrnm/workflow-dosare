import React from "react";
import {
  FileText, Car, AlertOctagon, Copy, Download, Loader2, Printer, X, FileCheck, FolderArchive
} from "lucide-react";
import { getStatusDefinition } from "../../../constants/config";
import ClaimAuditMeta from "../../common/ClaimAuditMeta";
import { modalHeaderClass } from "../../common/modalShellClasses";
import {
  generateazaProcesVerbalMasinaSchimb,
  generateazaFisaIntrareService,
  generateazaCerereDespagubireOmniasig,
  generateazaCerereDespagubireAsirom,
} from "../../../utils/pdfGenerator";
import { resolveCerereDespagubireKind, OMNIASIG_CERERE_PLATA } from "../../../utils/cerereDespagubire";
import { loadCachedBranding } from "../../../constants/branding";

export default function ClaimHeader({
  form,
  set,
  isNew,
  istoric = [],
  desktopUi = false,
  pdfMenuOpen,
  setPdfMenuOpen,
  pdfMenuRef,
  downloadingZip,
  handleDownloadZip,
  onDownloadZip,
  handleDuplicate,
  onDuplicate,
  onOpenReceptie,
  onOpenSettlement,
  requestClose,
  handleMouseDown,
}) {
  const downloadZipFn = handleDownloadZip || onDownloadZip;
  const duplicateFn = handleDuplicate || onDuplicate;
  return (
    <div
      onMouseDown={handleMouseDown}
      className={modalHeaderClass(
        desktopUi,
        "flex items-center justify-between px-3 py-2 select-none cursor-move"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <FileText size={16} className={`shrink-0 ${desktopUi ? "text-[var(--app-muted)]" : "text-white/80"}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`font-semibold text-[13px] tracking-tight truncate ${desktopUi ? "text-[var(--app-text)]" : "text-white"}`}>
              {isNew ? "Dosar Nou" : (form.numarDosar ? `Dosar ${form.numarDosar}` : "Dosar Fără Număr")}
            </span>
            {/* Single status chip */}
            {!isNew && (() => {
              const sd = getStatusDefinition(form.status);
              const phaseClass = {
                start: "bg-[var(--app-surface-muted)] text-[var(--app-text)]",
                eval: "bg-[var(--app-surface-muted)] text-[var(--app-text)]",
                lucru: "bg-[var(--app-warning-muted)] text-[var(--app-warning)]",
                final: "bg-[var(--app-success-muted)] text-[var(--app-success)]",
              };
              return (
                <span
                  className={`shrink-0 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md ${phaseClass[sd.phase] || phaseClass.start}`}
                >
                  {sd.num}/9 · {sd.label}
                </span>
              );
            })()}
            {form.blocat && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md bg-[var(--app-danger)] text-[var(--app-danger-text)]">
                <AlertOctagon size={10} /> Blocat
              </span>
            )}
          </div>
          <span className={`text-[10.5px] font-mono font-medium flex items-center gap-1.5 truncate ${desktopUi ? "text-slate-700 dark:text-slate-300" : "text-white/90"}`}>
            <Car size={11} className="shrink-0 text-slate-500 dark:text-slate-400" />
            <span className="truncate">{form.numarInmatriculare || "Fără nr."} · {form.marcaModel || "Model neprecizat"}</span>
          </span>
          {!isNew && (
            <ClaimAuditMeta
              claim={form}
              compact
              className={`mt-0.5 ${desktopUi ? "" : "text-white/70 [&_span.font-semibold]:text-white/90"}`}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!isNew && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (form.blocat) {
                  set("blocat", false);
                  set("motivBlocare", "");
                } else {
                  const motiv = window.prompt("Motiv blocare dosar:", form.motivBlocare || "");
                  if (motiv === null) return;
                  set("blocat", true);
                  set("motivBlocare", motiv.trim() || "Nespecificat");
                }
              }}
              className={`flex items-center gap-1 text-[10.5px] font-semibold border rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                form.blocat
                  ? "text-[var(--app-danger-text)] bg-[var(--app-danger)] border-[var(--app-danger)] hover:bg-[var(--app-danger-hover)]"
                  : desktopUi
                    ? "text-[var(--app-muted)] hover:text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                    : "text-white/80 hover:text-white border-white/20 hover:bg-white/10"
              }`}
              title={form.blocat ? "Deblochează dosarul" : "Marchează dosarul ca blocat"}
            >
              <AlertOctagon size={12} />
              <span className="hidden md:inline">{form.blocat ? " Deblochează" : " Blochează"}</span>
            </button>

            {onOpenReceptie && (
              <button
                type="button"
                onClick={onOpenReceptie}
                className={`flex items-center gap-1 text-[10.5px] font-semibold border rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                  desktopUi
                    ? "text-[var(--app-muted)] hover:text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                    : "text-white/80 hover:text-white border-white/20 hover:bg-white/10"
                }`}
                title="Recepție auto & Semnătură digitală pe ecran"
              >
                <FileCheck size={12} /><span className="hidden md:inline"> Recepție</span>
              </button>
            )}

            <button
              type="button"
              onClick={duplicateFn}
              className={`flex items-center gap-1 text-[10.5px] font-semibold border rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                desktopUi
                  ? "text-[var(--app-muted)] hover:text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                  : "text-white/80 hover:text-white border-white/20 hover:bg-white/10"
              }`}
              title="Duplică / Copiază datele acestui dosar"
            >
              <Copy size={12} /><span className="hidden md:inline"> Copiază</span>
            </button>

            <button
              type="button"
              onClick={downloadZipFn}
              disabled={downloadingZip}
              className={`flex items-center gap-1 text-[10.5px] font-semibold border rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                desktopUi
                  ? "text-[var(--app-muted)] hover:text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                  : "text-white/80 hover:text-white border-white/20 hover:bg-white/10"
              }`}
              title="Descarcă toate pozele și documentele într-o arhivă ZIP"
            >
              {downloadingZip ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              <span className="hidden md:inline"> ZIP</span>
            </button>

            {onOpenSettlement && (
              <button
                type="button"
                onClick={onOpenSettlement}
                className={`flex items-center gap-1 text-[10.5px] font-semibold border rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                  desktopUi
                    ? "text-[var(--app-muted)] hover:text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                    : "text-white/80 hover:text-white border-white/20 hover:bg-white/10"
                }`}
                title="Pachet decont complet pentru asigurător (1-Click ZIP)"
              >
                <FolderArchive size={12} /><span className="hidden md:inline"> Pachet Decont</span>
              </button>
            )}

            {/* Print / PDF — icon-only printer */}
            <div ref={pdfMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setPdfMenuOpen((v) => !v)}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors cursor-pointer ${
                  desktopUi
                    ? "text-[var(--app-muted)] hover:text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                    : "text-white/80 hover:text-white border-white/20 hover:bg-white/10"
                }`}
                title="Printează / exportă PDF"
                aria-label="Printează / exportă PDF"
                aria-expanded={pdfMenuOpen}
                aria-haspopup="menu"
              >
                <Printer size={14} />
              </button>
              {pdfMenuOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 top-[calc(100%+0.3rem)] z-[70] min-w-[11rem] rounded-lg border py-1 shadow-lg ${
                    desktopUi
                      ? "bg-[var(--app-surface)] border-[var(--app-border)]"
                      : "bg-[var(--app-surface-muted)] border-white/20"
                  }`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold ${
                      desktopUi
                        ? "text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                        : "text-white hover:bg-white/10"
                    }`}
                    onClick={async () => {
                      setPdfMenuOpen(false);
                      await generateazaFisaIntrareService(form);
                    }}
                  >
                    <FileText size={13} /> Fișă Intrare Service
                  </button>
                  {resolveCerereDespagubireKind(form.asigurator) === "omniasig" ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold ${
                        desktopUi
                          ? "text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                          : "text-white hover:bg-white/10"
                      }`}
                      onClick={async () => {
                        setPdfMenuOpen(false);
                        const branding = loadCachedBranding();
                        await generateazaCerereDespagubireOmniasig(form, {
                          atelierNume: branding?.atelierNume || OMNIASIG_CERERE_PLATA.beneficiar,
                          plata: {
                            beneficiar: OMNIASIG_CERERE_PLATA.beneficiar,
                            banca: OMNIASIG_CERERE_PLATA.banca,
                            cont: OMNIASIG_CERERE_PLATA.cont,
                          },
                        });
                      }}
                    >
                      <FileText size={13} /> Cerere Omniasig
                    </button>
                  ) : null}
                  {resolveCerereDespagubireKind(form.asigurator) === "asirom" ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold ${
                        desktopUi
                          ? "text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                          : "text-white hover:bg-white/10"
                      }`}
                      onClick={async () => {
                        setPdfMenuOpen(false);
                        const branding = loadCachedBranding();
                        await generateazaCerereDespagubireAsirom(form, branding);
                      }}
                    >
                      <FileText size={13} /> Cerere Asirom
                    </button>
                  ) : null}
                  {form.masinaSchimb ? (
                    <button
                      type="button"
                      role="menuitem"
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold ${
                        desktopUi
                          ? "text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                          : "text-white hover:bg-white/10"
                      }`}
                      onClick={() => {
                        setPdfMenuOpen(false);
                        generateazaProcesVerbalMasinaSchimb(form);
                      }}
                    >
                      <Car size={13} /> PV Auto la Schimb
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={requestClose}
          className={`min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-lg transition-colors ml-1 cursor-pointer active:scale-95 ${
            desktopUi
              ? "text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
              : "text-white/80 hover:text-white hover:bg-white/10"
          }`}
          aria-label="Închide dosarul"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
