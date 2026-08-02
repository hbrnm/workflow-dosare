import React, { useState } from "react";
import { Download, X, CheckSquare, Square, FileSpreadsheet, Layers, Wallet, CalendarClock, Car, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";
import { getStatusDefinition } from "../../constants/config";
import { fmtDate, todayISO, daysBetween } from "../../utils/dateUtils";

export default function ExportExcelModal({ claims = [], pragRidicare = 3, onClose }) {
  const [selectedModules, setSelectedModules] = useState({
    dosare: true,
    financiar: true,
    programari: true,
    masiniSchimb: true,
    statistici: true,
  });

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

  const handleExport = () => {
    if (selectedCount === 0) return;

    const wb = XLSX.utils.book_new();

    // 1. Modulul Dosare
    if (selectedModules.dosare) {
      const rows = claims.map((c) => ({
        "Nr. dosar": c.numarDosar || "—",
        "Tip Asigurare": c.tipAsigurare || "—",
        "Asigurător": c.asigurator || "—",
        "Client": c.client || "—",
        "Telefon Client": c.telefonClient || "—",
        "Nr. Înmatriculare": c.numarInmatriculare || "—",
        "VIN": c.vin || "—",
        "Marcă / Model": c.marcaModel || "—",
        "Status Curent": getStatusDefinition(c.status)?.label || c.status,
        "Blocat": c.blocat ? "DA" : "NU",
        "Motiv Blocat": c.motivBlocat || "—",
        "Data Deschiderii": fmtDate(c.dataDeschiderii),
        "Data Schimbare Status": fmtDate(c.dataSchimbareStatus),
        "Creat de": c.createdByEmail || "—",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Lista Dosare");
    }

    // 2. Modulul Financiar
    if (selectedModules.financiar) {
      const rows = claims.map((c) => {
        const fin = c.manopera || {};
        const tin = fin.tinichigerie || {};
        const vop = fin.vopsitorie || {};
        const facturatTotal = (Number(tin.facturat) || 0) + (Number(vop.facturat) || 0);

        return {
          "Nr. dosar": c.numarDosar || "—",
          "Client": c.client || "—",
          "Asigurător": c.asigurator || "—",
          "Valoare Deviz Estimat (RON)": c.valoareDeviz || 0,
          "Valoare Decontată (RON)": c.valoareDecontata || 0,
          "Diferență Regie / Client (RON)": c.diferentaRegie || 0,
          "Facturat Tinichigerie (RON)": tin.facturat || 0,
          "Ore Tinichigerie": tin.ore || 0,
          "Facturat Vopsitorie (RON)": vop.facturat || 0,
          "Ore Vopsitorie": vop.ore || 0,
          "Total Manoperă Facturată (RON)": facturatTotal,
          "Comandă Piese": c.pieseComandate ? "Comandate" : "Necomandate",
          "Piese Sosite": c.pieseSosite ? "Sosite" : "Incomplete / Neprimite",
          "Status Dosar": getStatusDefinition(c.status)?.label || c.status,
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Raport Financiar");
    }

    // 3. Modulul Programări Atelier
    if (selectedModules.programari) {
      const rows = claims
        .filter((c) => c.dataProgramare)
        .map((c) => ({
          "Nr. dosar": c.numarDosar || "—",
          "Client": c.client || "—",
          "Nr. Inmatriculare": c.numarInmatriculare || "—",
          "Marcă / Model": c.marcaModel || "—",
          "Data Programare": fmtDate(c.dataProgramare),
          "Tinichigiu / Mecanic Alocat": c.mecanicAlocat || "Nealocat",
          "Vopsitor Alocat": c.vopsitorAlocat || "Nealocat",
          "Estimare Finalizare Work": fmtDate(c.dataEstimataFinalizare),
          "Status Dosar": getStatusDefinition(c.status)?.label || c.status,
        }));
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "Nicio programare existentă" }]);
      XLSX.utils.book_append_sheet(wb, ws, "Programări Atelier");
    }

    // 4. Modulul Mașini la Schimb
    if (selectedModules.masiniSchimb) {
      const rows = claims
        .filter((c) => c.masinaSchimb && c.masinaSchimb.trim())
        .map((c) => {
          const zileEfective = daysBetween(c.dataDariiLaSchimb || c.dataProgramare);
          const depasit = c.zileChirieAudatex > 0 && zileEfective > c.zileChirieAudatex;
          return {
            "Nr. dosar": c.numarDosar || "—",
            "Client": c.client || "—",
            "Telefon Client": c.telefonClient || "—",
            "Mașină la Schimb Alocată": c.masinaSchimb,
            "Dată Predare Auto": fmtDate(c.dataDariiLaSchimb),
            "Zile Aprobate Audatex": c.zileChirieAudatex || 0,
            "Zile Efective Utilizate": zileEfective,
            "Status Depășire": depasit ? `Depășit cu ${zileEfective - c.zileChirieAudatex} zile` : "În grafic / OK",
            "Status Dosar": getStatusDefinition(c.status)?.label || c.status,
          };
        });
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "Nicio mașină la schimb alocată" }]);
      XLSX.utils.book_append_sheet(wb, ws, "Auto la Schimb");
    }

    // 5. Modulul Statistici pe Asigurători
    if (selectedModules.statistici) {
      const map = {};
      claims.forEach((c) => {
        const key = c.asigurator?.trim() || "Neprecizat";
        if (!map[key]) {
          map[key] = { total: 0, rca: 0, casco: 0, blocate: 0, facturate: 0, valoareDevizTotal: 0 };
        }
        map[key].total += 1;
        if (c.tipAsigurare === "RCA") map[key].rca += 1;
        if (c.tipAsigurare === "CASCO") map[key].casco += 1;
        if (c.blocat) map[key].blocate += 1;
        if (c.status === "facturat") map[key].facturate += 1;
        map[key].valoareDevizTotal += Number(c.valoareDeviz) || 0;
      });

      const rows = Object.entries(map).map(([asigurator, stat]) => ({
        "Asigurător": asigurator,
        "Total Dosare": stat.total,
        "Dosare RCA": stat.rca,
        "Dosare CASCO": stat.casco,
        "Dosare Blocate": stat.blocate,
        "Dosare Finalizate / Facturate": stat.facturate,
        "Valoare Devize Însumată (RON)": stat.valoareDevizTotal,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Statistici Asigurători");
    }

    XLSX.writeFile(wb, `export-workflow-dosare-${todayISO()}.xlsx`);
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
      count: claims.filter((c) => c.dataProgramare).length,
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FCFAF5] rounded-2xl border border-[#DAD4C6] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#1C2127] text-white px-5 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C98A2B] text-white flex items-center justify-center font-bold shadow-sm">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-[16px] tracking-tight text-white">Export în Excel</h2>
              <p className="text-[11.5px] text-white/70">Alege modulele ale căror date dorești să le exporți</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selection Toolbar */}
        <div className="px-5 py-2.5 bg-[#EFEAE1] border-b border-[#DAD4C6] flex items-center justify-between text-[12px] font-semibold text-[#6B6558]">
          <span>Module selectate: <strong className="text-[#C98A2B] font-bold">{selectedCount} din {moduleDefinitions.length}</strong></span>
          <div className="flex gap-3">
            <button onClick={selectAll} className="text-[#3B5166] hover:text-[#23282E] hover:underline">Selectează toate</button>
            <span className="text-[#DAD4C6]">|</span>
            <button onClick={deselectAll} className="text-[#B23A2E] hover:underline">Deselectează toate</button>
          </div>
        </div>

        {/* Modules List */}
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {moduleDefinitions.map(({ id, title, desc, icon: Icon, count }) => {
            const active = selectedModules[id];
            return (
              <div
                key={id}
                onClick={() => toggleModule(id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                  active
                    ? "bg-white border-[#C98A2B] shadow-sm"
                    : "bg-[#FAF8F5]/60 border-[#DAD4C6] hover:bg-white text-opacity-70"
                }`}
              >
                <div className="mt-0.5 text-[#C98A2B]">
                  {active ? <CheckSquare size={19} className="fill-[#C98A2B] text-white" /> : <Square size={19} className="text-[#8A8375]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-extrabold text-[#23282E] flex items-center gap-1.5">
                      <Icon size={15} className={active ? "text-[#C98A2B]" : "text-[#8A8375]"} />
                      {title}
                    </span>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#EFEAE1] text-[#3B5166]">
                      {count}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[#6B6558] mt-0.5 leading-snug">
                    {desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-[#DAD4C6] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#DAD4C6] text-[#3B5166] font-bold text-[13px] hover:bg-[#FAF8F5]"
          >
            Renunță
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={selectedCount === 0}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[13px] shadow-sm transition-all ${
              selectedCount > 0
                ? "bg-[#C98A2B] text-white hover:bg-[#B37A22] active:scale-95"
                : "bg-[#DAD4C6] text-white cursor-not-allowed"
            }`}
          >
            <Download size={16} />
            <span>Descarcă Excel (.xlsx)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
