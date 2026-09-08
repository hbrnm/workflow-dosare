import React from "react";
import {
  FileText, Car, AlertOctagon, Copy, Download, Loader2, Printer, X, FileCheck, FolderArchive, Calculator
} from "lucide-react";
import { getStatusDefinition } from "../../../constants/config";
import ClaimAuditMeta from "../../common/ClaimAuditMeta";
import { modalHeaderClass } from "../../common/modalShellClasses";
import {
  generateazaProcesVerbalMasinaSchimb,
  generateazaFisaIntrareService,
  generateazaCerereDespagubireOmniasig,
  generateazaCerereDespagubireAsirom,
  generateazaContractInchiriere,
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
  onOpenQuickEstimate,
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
        <FileText size={16} className="shrink-0 text-[var(--app-muted)]" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-extrabold text-[14px] tracking-tight truncate text-[var(--app-text-strong)]">
              {isNew ? "Dosar Nou" : (form.numarDosar ? `Dosar ${form.numarDosar}` : "Dosar Fără Număr")}
            </span>
            {/* Single status chip */}
            {!isNew && (() => {
              const sd = getStatusDefinition(form.status);
              return (
                <span
                  className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--app-accent)]/15 text-[var(--app-accent)] border border-[var(--app-accent)]/30"
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
          <span className="text-[12px] font-mono font-bold flex items-center gap-1.5 truncate mt-0.5 text-[var(--app-text-strong)]">
            <Car size={12} className="shrink-0 text-[var(--app-muted)]" />
            <span className="truncate">{form.numarInmatriculare || "Fără nr."} · {form.marcaModel || "Model neprecizat"}</span>
          </span>
          {!isNew && (
            <ClaimAuditMeta
              claim={form}
              compact
              className="mt-0.5 text-[var(--app-text)]"
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
                  : "text-[var(--app-text)] hover:text-[var(--app-text-strong)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
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
                className="flex items-center gap-1 text-[10.5px] font-semibold border rounded-lg px-2 py-1 transition-colors cursor-pointer text-[var(--app-text)] hover:text-[var(--app-text-strong)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                title="Recepție auto & Semnătură digitală pe ecran"
              >
                <FileCheck size={12} /><span className="hidden md:inline"> Recepție</span>
              </button>
            )}

            {onOpenQuickEstimate && (
              <button
                type="button"
                onClick={onOpenQuickEstimate}
                className="flex items-center gap-1 text-[10.5px] font-semibold border rounded-lg px-2 py-1 transition-colors cursor-pointer text-[var(--app-text)] hover:text-[var(--app-text-strong)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
                title="Notă de Constatare & Estimare Rapidă deviz"
              >
                <Calculator size={12} /><span className="hidden md:inline"> Estimare</span>
              </button>
            )}

            <button
              type="button"
              onClick={duplicateFn}
              className="flex items-center gap-1 text-[10.5px] font-semibold border rounded-lg px-2 py-1 transition-colors cursor-pointer text-[var(--app-text)] hover:text-[var(--app-text-strong)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
              title="Duplică / Copiază datele acestui dosar"
            >
              <Copy size={12} /><span className="hidden md:inline"> Copiază</span>
            </button>

            <button
              type="button"
              onClick={downloadZipFn}
              disabled={downloadingZip}
              className="flex items-center gap-1 text-[10.5px] font-semibold border rounded-lg px-2 py-1 transition-colors cursor-pointer text-[var(--app-text)] hover:text-[var(--app-text-strong)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
              title="Descarcă toate pozele și documentele într-o arhivă ZIP"
            >
              {downloadingZip ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              <span className="hidden md:inline"> ZIP</span>
            </button>


            {/* Print / PDF — icon-only printer */}
            <div ref={pdfMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setPdfMenuOpen((v) => !v)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors cursor-pointer text-[var(--app-text)] hover:text-[var(--app-text-strong)] border-[var(--app-border)] hover:bg-[var(--app-surface-2)]"
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
                  className="absolute right-0 top-[calc(100%+0.3rem)] z-[70] min-w-[11rem] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1 shadow-2xl"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-[var(--app-text-strong)] hover:bg-[var(--app-surface-2)] rounded-lg transition-colors"
                    onClick={async () => {
                      setPdfMenuOpen(false);
                      await generateazaFisaIntrareService(form);
                    }}
                  >
                    <FileText size={13} /> Fișă Intrare Service
                  </button>
                  {onOpenSettlement && (
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-[var(--app-text-strong)] hover:bg-[var(--app-surface-2)] rounded-lg transition-colors"
                      onClick={() => {
                        setPdfMenuOpen(false);
                        onOpenSettlement();
                      }}
                    >
                      <FolderArchive size={13} /> Pachet Decont (ZIP)
                    </button>
                  )}
                  {resolveCerereDespagubireKind(form.asigurator) === "omniasig" ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-[var(--app-text-strong)] hover:bg-[var(--app-surface-2)] rounded-lg transition-colors"
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
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-[var(--app-text-strong)] hover:bg-[var(--app-surface-2)] rounded-lg transition-colors"
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
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-[var(--app-text-strong)] hover:bg-[var(--app-surface-2)] rounded-lg transition-colors"
                        onClick={() => {
                          setPdfMenuOpen(false);
                          generateazaProcesVerbalMasinaSchimb(form);
                        }}
                      >
                        <Car size={13} /> PV Auto la Schimb
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-[var(--app-text-strong)] hover:bg-[var(--app-surface-2)] rounded-lg transition-colors"
                        onClick={() => {
                          setPdfMenuOpen(false);
                          generateazaContractInchiriere(form);
                        }}
                      >
                        <FileText size={13} /> Contract Închiriere Auto
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={requestClose}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-lg transition-colors ml-1 cursor-pointer active:scale-95 text-[var(--app-muted)] hover:text-[var(--app-text-strong)] hover:bg-[var(--app-surface-2)]"
          aria-label="Închide dosarul"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
