import React from "react";
import { Wallet, BarChart3, Package, Wrench } from "lucide-react";
import { AUDATEX_DEVIZ_UI_FIELDS } from "../../../constants/audatexDevizFields";
import AudatexImportCard from "../../common/AudatexImportCard";

export default function ClaimFinancialTab({
  form,
  setForm,
  set,
  setFinancial,
  readOnly = false,
  manoperaTarife,
  setAudatexDevizField,
  setCheltuieliService,
  applyLaborFromOre,
  getAudatexDevizValue,
  valoareDevizAudatex,
  valoareAcceptPlata,
  valoareFransiza,
  totalDevizComponente,
  totalPieseAudatex,
  totalManoperaAudatex,
  manoperaVopsitorieAudatex,
  materialeVopsitorie,
  venitManoperaAudatex,
  costManoperaTinichigerieService,
  costManoperaVopsitorieService,
  oreLucrateTinichigerie,
  oreLucrateVopsitorie,
  laborPreview,
  laborRatesConfigured,
  costManoperaService,
  marjaManopera,
  pretPieseAudatex,
  pretPieseService,
  marjaPiese,
  cheltuieliDiverseService,
  costMaterialeVopsitorieService,
  costConsumabileTinichigerieService,
  costMasinaSchimb,
  venitNetTotal,
  totalCosturiService,
  profitBrutReal,
  marjaProfitProc,
  serviceCostBreakdown,
  onNotify,
  setActiveTab,
}) {
  const financial = form.financiar || {};

  return (
    <div className="space-y-3">
      {/* Deviz Audatex — cele 6 totaluri din cuprins */}
      <div className="bg-[var(--app-surface)] border-2 border-[var(--app-accent)]/30 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--app-border)] pb-2">
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-wide text-[var(--app-text-strong)] flex items-center gap-1.5">
              <Wallet size={16} className="text-[var(--app-accent)]" />
              Deviz Audatex
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
              Totaluri din cuprinsul devizului — completează manual sau importă PDF mai jos.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase text-[var(--app-muted)] bg-[var(--app-surface-2)] px-2 py-1 rounded-md">
            lei · fără TVA (exceptând ultimul rând)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AUDATEX_DEVIZ_UI_FIELDS.map(({ key, label, primary }) => (
            <div
              key={key}
              className={primary ? "sm:col-span-2 rounded-lg border border-[var(--app-accent)]/30 bg-[var(--app-surface-2)] p-2.5" : ""}
            >
              <label className={`block mb-1 ${primary ? "text-[11px] font-extrabold text-[var(--app-accent)]" : "text-[10.5px] font-bold text-[var(--app-muted)]"}`}>
                {label}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                disabled={readOnly}
                className={`w-full p-2.5 border rounded-lg font-mono bg-[var(--app-surface)] ${
                  primary
                    ? "border-[var(--app-accent)]/50 font-extrabold text-[16px] text-[var(--app-text-strong)]"
                    : "border-[var(--app-border)] font-bold text-[13px]"
                }`}
                value={getAudatexDevizValue(key)}
                onChange={(e) => setAudatexDevizField(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {totalDevizComponente > 0 && Math.abs(totalDevizComponente - valoareDevizAudatex) > 1 && (
          <p className="text-[10px] text-[var(--app-warning)] bg-[var(--app-warning)]/10 border border-[var(--app-warning)]/30 rounded-lg px-2.5 py-1.5">
            Suma piese + manoperă + suplimente + vopsitorie = {totalDevizComponente.toLocaleString("ro-RO")} lei
            — diferă de total reparație fără TVA ({valoareDevizAudatex.toLocaleString("ro-RO")} lei)
          </p>
        )}
      </div>

      <AudatexImportCard
        claim={form}
        setClaim={setForm}
        showNotice={onNotify}
        readOnly={readOnly}
        manoperaTarife={manoperaTarife}
        onImported={() => setActiveTab?.("financial")}
      />

      {/* Reglementare asigurător */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3 shadow-2xs">
        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] border-b border-[var(--app-border)] pb-1.5">
          Accept plată &amp; franșiză
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px]">
          <div>
            <label className="block text-[10.5px] font-bold text-[var(--app-success)] mb-1">Accept plată (lei)</label>
            <input
              type="number"
              min={0}
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-success)]/40 rounded-lg font-mono font-extrabold text-[12.5px] bg-[var(--app-success-muted)]/40 text-[var(--app-success)]"
              value={financial.valoareAcceptPlata || form.valoareAcceptataReglata || 0}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                setForm((f) => ({
                  ...f,
                  valoareAcceptataReglata: val,
                  financiar: { ...(f.financiar || {}), valoareAcceptPlata: val },
                }));
              }}
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-bold text-[var(--app-danger)] mb-1">Franșiză (lei)</label>
            <input
              type="number"
              min={0}
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-danger)]/30 rounded-lg font-mono font-bold text-[12.5px] bg-[var(--app-danger)]/10 text-[#8C2E2E]"
              value={financial.valoareFransiza || 0}
              onChange={(e) => setFinancial("valoareFransiza", Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-bold text-[var(--app-muted)] mb-1">Nr. factură</label>
            <input
              type="text"
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-bold text-[12px] bg-[var(--app-surface)]"
              placeholder="ex: FACT-1029"
              value={financial.numarFactura || form.numarFactura || ""}
              onChange={(e) => setFinancial("numarFactura", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Secțiunea 3: Costuri reale service */}
      <div className="bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl p-4 space-y-3 shadow-2xs">
        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] border-b border-[var(--app-border)] pb-1.5">
          Costuri reale service (achiziții)
        </div>

        {!laborRatesConfigured && (oreLucrateTinichigerie > 0 || oreLucrateVopsitorie > 0) && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
            Tarifele manoperei nu sunt configurate — costul rămâne 0. Mergi la{" "}
            <strong>Setări → General → Tarife manoperă internă</strong> și completează salariul lunar
            (ex. 8000 lei) sau tariful manual (lei/h), apoi apasă „Calculează cost din ore”.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Ore tinichigerie (deviz / lucrate)</label>
            <input
              type="number"
              min={0}
              step="0.1"
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12.5px] bg-[var(--app-surface)]"
              value={oreLucrateTinichigerie || ""}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                if (manoperaTarife.autoCalcFromOre !== false) {
                  applyLaborFromOre(val, undefined);
                } else {
                  setFinancial("oreLucrateTinichigerie", val);
                }
              }}
              placeholder="ex: 4.3 (din Audatex UT)"
            />
            {laborPreview.rateTinichigerie > 0 && (
              <p className="mt-1 text-[9px] text-[var(--app-muted)]">
                Tarif intern: {laborPreview.rateTinichigerie.toLocaleString("ro-RO")} lei/h
                {manoperaTarife.autoCalcFromOre !== false ? ` → ${laborPreview.tinichigerie.toLocaleString("ro-RO")} lei` : ""}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Ore vopsitorie (deviz / lucrate)</label>
            <input
              type="number"
              min={0}
              step="0.1"
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12.5px] bg-[var(--app-surface)]"
              value={oreLucrateVopsitorie || ""}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                if (manoperaTarife.autoCalcFromOre !== false) {
                  applyLaborFromOre(undefined, val);
                } else {
                  setFinancial("oreLucrateVopsitorie", val);
                }
              }}
              placeholder="ex: 7.3 (din Audatex ORE)"
            />
            {laborPreview.rateVopsitorie > 0 && (
              <p className="mt-1 text-[9px] text-[var(--app-muted)]">
                Tarif intern: {laborPreview.rateVopsitorie.toLocaleString("ro-RO")} lei/h
                {manoperaTarife.autoCalcFromOre !== false ? ` → ${laborPreview.vopsitorie.toLocaleString("ro-RO")} lei` : ""}
              </p>
            )}
          </div>
          <div className="flex items-end">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => applyLaborFromOre()}
              className="w-full px-3 py-2 rounded-lg border border-[var(--app-accent)]/40 bg-[var(--app-accent)]/10 text-[var(--app-accent)] text-[11px] font-bold hover:bg-[var(--app-accent)]/20 disabled:opacity-50 cursor-pointer"
            >
              Calculează cost din ore
            </button>
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Achiziție piese service (lei)</label>
            <input
              type="number"
              min={0}
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[var(--app-danger)] text-[12.5px] bg-[var(--app-surface)]"
              value={form.valoareAchizitiePiese || 0}
              onChange={(e) => set("valoareAchizitiePiese", Number(e.target.value) || 0)}
              placeholder="Cost real piese"
            />
            {pretPieseAudatex > 0 && (
              <p className="mt-1 text-[10px] text-[var(--app-muted)]">
                Marjă piese față de deviz: {(pretPieseAudatex - pretPieseService).toLocaleString("ro-RO")} lei
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Cost manoperă tinichigerie (lei)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12.5px] bg-[var(--app-surface)]"
              value={costManoperaTinichigerieService || 0}
              onChange={(e) => setFinancial("costManoperaTinichigerieService", Number(e.target.value) || 0)}
              placeholder="Ore × tarif intern, salarii alocate…"
            />
            {totalManoperaAudatex > 0 && (
              <p className="mt-1 text-[9px] text-[var(--app-muted)]">
                Deviz Audatex: {totalManoperaAudatex.toLocaleString("ro-RO")} lei
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Cost manoperă vopsitorie (lei)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12.5px] bg-[var(--app-surface)]"
              value={costManoperaVopsitorieService || 0}
              onChange={(e) => setFinancial("costManoperaVopsitorieService", Number(e.target.value) || 0)}
              placeholder="Subcontractor vopsitorie, ore vopsitor…"
            />
            {manoperaVopsitorieAudatex > 0 && (
              <p className="mt-1 text-[9px] text-[var(--app-muted)]">
                Deviz Audatex (manoperă vops): {manoperaVopsitorieAudatex.toLocaleString("ro-RO")} lei
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Cost materiale vopsitorie reale (lei)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12.5px] bg-[var(--app-surface)]"
              value={costMaterialeVopsitorieService || 0}
              onChange={(e) => setFinancial("costMaterialeVopsitorieService", Number(e.target.value) || 0)}
              placeholder="Lac, grund, diluant, chit, mascare…"
            />
            {materialeVopsitorie > 0 && (
              <p className="mt-1 text-[9px] text-[var(--app-muted)]">
                Deviz Audatex materiale vopsitorie: {materialeVopsitorie.toLocaleString("ro-RO")} lei
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Consumabile tinichigerie (lei)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12.5px] bg-[var(--app-surface)]"
              value={costConsumabileTinichigerieService || 0}
              onChange={(e) => setFinancial("costConsumabileTinichigerieService", Number(e.target.value) || 0)}
              placeholder="Discuri, burghie, sârmă sudură, abrazive…"
            />
            <p className="mt-1 text-[9px] text-[var(--app-muted)]">
              Consumabile atelier care nu apar explicit pe deviz.
            </p>
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Cheltuieli diverse service (lei)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12.5px] bg-[var(--app-surface)]"
              value={cheltuieliDiverseService || 0}
              onChange={(e) => setCheltuieliService(Number(e.target.value) || 0)}
              placeholder="Transport, consumabile, subcontractori…"
            />
            <p className="mt-1 text-[9px] text-[var(--app-muted)]">
              Costuri reale în afara pieselor — nu se iau din devizul Audatex.
            </p>
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold text-[var(--app-muted)] mb-1">Cost auto schimb (lei)</label>
            <input
              type="number"
              min={0}
              disabled={readOnly}
              className="w-full p-2 border border-[var(--app-border)] rounded-lg font-mono font-bold text-[12px] bg-[var(--app-surface)]"
              value={costMasinaSchimb || 0}
              onChange={(e) => setFinancial("costMasinaSchimb", Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Raport Financiar Real */}
      <div className="p-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-2)] shadow-xs mt-2">
        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--app-muted)] border-b border-[var(--app-border)] pb-1.5 mb-2 flex items-center justify-between">
          <span>Raport Financiar &amp; Profitabilitate Reală Dosar</span>
          <span className="text-[10.5px] text-[var(--app-muted)] font-normal uppercase">Calculat automat</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {/* Venit Net */}
          <div className="p-2.5 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)]">
            <div className="text-[10px] font-semibold text-[var(--app-muted)] uppercase mb-1">Venit Net</div>
            <div className="text-[15px] font-extrabold text-[var(--app-text-strong)] font-mono">{venitNetTotal.toLocaleString("ro-RO")} <span className="text-[10px] font-normal">lei</span></div>
            <div className="text-[9px] text-[var(--app-muted)] mt-0.5">{valoareAcceptPlata > 0 ? "Accept Plată" : "Deviz Audatex"}</div>
          </div>

          {/* Total Costuri */}
          <div className="p-2.5 rounded-xl bg-[var(--app-surface)] border border-[var(--app-danger)]/30">
            <div className="text-[10px] font-semibold text-[var(--app-danger)] uppercase mb-1">Total Costuri</div>
            <div className="text-[15px] font-extrabold text-[var(--app-danger)] font-mono">{totalCosturiService.toLocaleString("ro-RO")} <span className="text-[10px] font-normal">lei</span></div>
            <div className="text-[9px] text-[var(--app-muted)] mt-0.5">Piese + Manoperă + Materiale + Consumabile + Diverse + Schimb</div>
          </div>

          {/* Profit Brut */}
          <div className={`p-2.5 rounded-xl bg-[var(--app-surface)] border ${profitBrutReal >= 0 ? "border-[var(--app-success)]/30" : "border-[var(--app-danger)]/30"}`}>
            <div className="text-[10px] font-semibold text-[var(--app-muted)] uppercase mb-1">Profit Brut</div>
            <div className={`text-[15px] font-extrabold font-mono ${profitBrutReal >= 0 ? "text-[var(--app-success)]" : "text-[var(--app-danger)]"}`}>
              {profitBrutReal >= 0 ? "+" : ""}{profitBrutReal.toLocaleString("ro-RO")} <span className="text-[10px] font-normal">lei</span>
            </div>
            <div className="text-[9px] text-[var(--app-muted)] mt-0.5">Venit - Costuri Service</div>
          </div>

          {/* Marjă Profit */}
          <div className={`p-2.5 rounded-xl border ${parseFloat(marjaProfitProc) >= 20 ? "bg-emerald-50 border-[var(--app-success)]/40" : parseFloat(marjaProfitProc) >= 0 ? "bg-amber-50 border-amber-300" : "bg-red-50 border-[var(--app-danger)]/40"}`}>
            <div className="text-[10px] font-semibold text-[var(--app-muted)] uppercase mb-1">Marjă Profit</div>
            <div className={`text-[18px] font-extrabold font-mono ${parseFloat(marjaProfitProc) >= 20 ? "text-[var(--app-success)]" : parseFloat(marjaProfitProc) >= 0 ? "text-[var(--app-warning)]" : "text-[var(--app-danger)]"}`}>
              {marjaProfitProc}%
            </div>
            <div className="text-[9px] text-[var(--app-muted)] mt-0.5">
              {parseFloat(marjaProfitProc) >= 25 ? "Excelent" : parseFloat(marjaProfitProc) >= 15 ? "Acceptabil" : parseFloat(marjaProfitProc) >= 0 ? "Slab" : "Pierdere"}
            </div>
          </div>
        </div>

        {/* Structură costuri service */}
        <div className="mt-2.5 p-2.5 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl">
          <div className="text-[10.5px] font-bold text-[var(--app-muted)] uppercase mb-2 flex items-center gap-1">
            <BarChart3 size={12} /> Structură costuri service
            {serviceCostBreakdown.total > 0 && (
              <span className="ml-auto font-mono font-normal normal-case text-[10px] text-[var(--app-text-strong)]">
                {serviceCostBreakdown.total.toLocaleString("ro-RO")} lei
              </span>
            )}
          </div>

          {serviceCostBreakdown.rows.length === 0 ? (
            <p className="text-[10px] text-[var(--app-muted)]">Completează costurile reale pentru a vedea distribuția.</p>
          ) : (
            <>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--app-surface-2)] border border-[var(--app-border)] mb-2.5">
                {serviceCostBreakdown.rows.map((row) => (
                  <div
                    key={row.key}
                    className={`${row.barClass} h-full min-w-[2px] transition-all`}
                    style={{ width: `${row.pct}%` }}
                    title={`${row.label}: ${row.amount.toLocaleString("ro-RO")} lei (${row.pct}%)`}
                  />
                ))}
              </div>
              <div className="space-y-1.5">
                {serviceCostBreakdown.rows.map((row) => (
                  <div key={row.key} className="flex items-center gap-2 text-[10.5px]">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${row.barClass}`} />
                    <span className="flex-1 min-w-0 truncate text-[var(--app-muted)]">{row.label}</span>
                    <span className="font-mono font-bold text-[var(--app-text-strong)] shrink-0">
                      {row.amount.toLocaleString("ro-RO")} lei
                    </span>
                    <span className="font-mono text-[var(--app-muted)] w-10 text-right shrink-0">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Marjă piese */}
        <div className="mt-2.5 p-2.5 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl">
          <div className="text-[10.5px] font-bold text-[var(--app-muted)] uppercase mb-1.5 flex items-center gap-1"><Package size={12} /> Marjă piese</div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-[var(--app-muted)]">Audatex: <strong className="text-[var(--app-text-strong)] font-mono">{pretPieseAudatex.toLocaleString("ro-RO")} lei</strong></span>
            <span className="text-[var(--app-muted)]">Cost service: <strong className="text-[var(--app-danger)] font-mono">{pretPieseService.toLocaleString("ro-RO")} lei</strong></span>
            <span className={`font-extrabold font-mono text-[12px] ${marjaPiese >= 0 ? "text-[var(--app-success)]" : "text-[var(--app-danger)]"}`}>
              {marjaPiese >= 0 ? "+" : ""}{marjaPiese.toLocaleString("ro-RO")} lei
            </span>
          </div>
        </div>

        {/* Marjă manoperă */}
        <div className="mt-2 p-2.5 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-xl">
          <div className="text-[10.5px] font-bold text-[var(--app-muted)] uppercase mb-1.5 flex items-center gap-1"><Wrench size={12} /> Marjă manoperă</div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-[var(--app-muted)]">
              Audatex: <strong className="text-[var(--app-text-strong)] font-mono">{venitManoperaAudatex.toLocaleString("ro-RO")} lei</strong>
              <span className="ml-1 text-[9px]">(tinichigerie {totalManoperaAudatex.toLocaleString("ro-RO")} + vops {manoperaVopsitorieAudatex.toLocaleString("ro-RO")})</span>
            </span>
            <span className="text-[var(--app-muted)]">Cost service: <strong className="text-[var(--app-danger)] font-mono">{costManoperaService.toLocaleString("ro-RO")} lei</strong></span>
            <span className={`font-extrabold font-mono text-[12px] ${marjaManopera >= 0 ? "text-[var(--app-success)]" : "text-[var(--app-danger)]"}`}>
              {marjaManopera >= 0 ? "+" : ""}{marjaManopera.toLocaleString("ro-RO")} lei
            </span>
          </div>
          <p className="mt-1.5 text-[9px] text-[var(--app-muted)]">
            Materiale vopsitorie (deviz): {materialeVopsitorie.toLocaleString("ro-RO")} lei — nu intră în marja manoperă.
            {valoareFransiza > 0 ? (
              <span className="ml-2">Franșiză client: <strong className="text-[#8C2E2E]">{valoareFransiza.toLocaleString("ro-RO")} lei</strong></span>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
