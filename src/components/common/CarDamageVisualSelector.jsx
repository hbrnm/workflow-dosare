import React from "react";
import { Car, Check, RotateCcw, AlertTriangle } from "lucide-react";

/**
 * Piese / Panouri de caroserie disponibile pe schema interactivă a mașinii
 */
export const CAR_PANELS = [
  // FAȚĂ
  { id: "bara_fata", name: "Bară Față", zone: "fata", x: 140, y: 15, w: 120, h: 32, rx: 12 },
  { id: "grila_faruri", name: "Faruri & Grilă", zone: "fata", x: 150, y: 52, w: 100, h: 22, rx: 6 },
  { id: "capota", name: "Capotă Motor", zone: "fata", x: 145, y: 78, w: 110, h: 70, rx: 8 },
  { id: "parbriz", name: "Parbriz", zone: "fata", x: 150, y: 152, w: 100, h: 42, rx: 6 },

  // LATERAL STÂNGA
  { id: "aripa_fata_stanga", name: "Aripă Față Stg.", zone: "stanga", x: 80, y: 75, w: 58, h: 65, rx: 6 },
  { id: "oglinzi_stanga", name: "Oglindă Stg.", zone: "stanga", x: 62, y: 146, w: 22, h: 20, rx: 4 },
  { id: "usa_fata_stanga", name: "Ușă Față Stg.", zone: "stanga", x: 80, y: 146, w: 62, h: 68, rx: 6 },
  { id: "prag_stanga", name: "Prag Stg.", zone: "stanga", x: 64, y: 172, w: 12, h: 108, rx: 3 },
  { id: "usa_spate_stanga", name: "Ușă Spate Stg.", zone: "stanga", x: 80, y: 218, w: 62, h: 65, rx: 6 },
  { id: "aripa_spate_stanga", name: "Aripă Spate Stg.", zone: "stanga", x: 80, y: 288, w: 58, h: 72, rx: 6 },
  { id: "jante_stanga", name: "Jante / Roți Stg.", zone: "stanga", x: 50, y: 88, w: 18, h: 240, rx: 5 },

  // LATERAL DREAPTA
  { id: "aripa_fata_dreapta", name: "Aripă Față Dr.", zone: "dreapta", x: 262, y: 75, w: 58, h: 65, rx: 6 },
  { id: "oglinzi_dreapta", name: "Oglindă Dr.", zone: "dreapta", x: 316, y: 146, w: 22, h: 20, rx: 4 },
  { id: "usa_fata_dreapta", name: "Ușă Față Dr.", zone: "dreapta", x: 258, y: 146, w: 62, h: 68, rx: 6 },
  { id: "prag_dreapta", name: "Prag Dr.", zone: "dreapta", x: 324, y: 172, w: 12, h: 108, rx: 3 },
  { id: "usa_spate_dreapta", name: "Ușă Spate Dr.", zone: "dreapta", x: 258, y: 218, w: 62, h: 65, rx: 6 },
  { id: "aripa_spate_dreapta", name: "Aripă Spate Dr.", zone: "dreapta", x: 262, y: 288, w: 58, h: 72, rx: 6 },
  { id: "jante_dreapta", name: "Jante / Roți Dr.", zone: "dreapta", x: 332, y: 88, w: 18, h: 240, rx: 5 },

  // CENTRAL & SPATE
  { id: "plafon", name: "Plafon", zone: "central", x: 150, y: 198, w: 100, h: 75, rx: 8 },
  { id: "luneta", name: "Lunetă", zone: "spate", x: 152, y: 278, w: 96, h: 36, rx: 6 },
  { id: "hayon_portbagaj", name: "Capotă Portbagaj / Hayon", zone: "spate", x: 148, y: 318, w: 104, h: 54, rx: 8 },
  { id: "stopuri_spate", name: "Stopuri Spate", zone: "spate", x: 150, y: 376, w: 100, h: 18, rx: 5 },
  { id: "bara_spate", name: "Bară Spate", zone: "spate", x: 140, y: 398, w: 120, h: 32, rx: 12 },
];

/**
 * Selector grafic interactiv al elementelor de caroserie avariate
 */
export default function CarDamageVisualSelector({
  selectedPanels = [],
  onChange,
  className = "",
}) {
  const togglePanel = (panelId) => {
    if (selectedPanels.includes(panelId)) {
      onChange(selectedPanels.filter((id) => id !== panelId));
    } else {
      onChange([...selectedPanels, panelId]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectedCount = selectedPanels.length;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Antet cu număr elemente selectate și reset */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Car size={15} className="text-amber-400" />
          <span className="font-bold text-slate-200">
            Selectează pe schemă elementele avariate
          </span>
          {selectedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold text-[10.5px] border border-rose-500/30">
              {selectedCount} {selectedCount === 1 ? "element" : "elemente"}
            </span>
          )}
        </div>

        {selectedCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold transition-colors"
          >
            <RotateCcw size={12} />
            <span>Deselectează tot</span>
          </button>
        )}
      </div>

      {/* Schema Mașinii SVG Interactivă */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-center gap-4 overflow-hidden shadow-inner">
        {/* Contur mașină (SVG) */}
        <div className="relative w-[280px] h-[340px] select-none touch-manipulation shrink-0">
          <svg
            viewBox="0 0 400 450"
            className="w-full h-full drop-shadow-md"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Silueta exterioară a mașinii */}
            <path
              d="M 130 35 C 130 15, 270 15, 270 35 L 290 85 L 340 100 C 355 105, 355 350, 340 365 L 290 380 L 270 430 C 270 445, 130 445, 130 430 L 110 380 L 60 365 C 45 350, 45 105, 60 100 L 110 85 Z"
              fill="#0F172A"
              stroke="#334155"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />

            {/* Marcaj Față / Spate */}
            <text x="200" y="8" fill="#64748B" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="2">
              ▲ PARTEA DIN FAȚĂ ▲
            </text>
            <text x="200" y="445" fill="#64748B" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="2">
              ▼ PARTEA DIN SPATE ▼
            </text>

            {/* Panouri interactive */}
            {CAR_PANELS.map((p) => {
              const isSelected = selectedPanels.includes(p.id);
              return (
                <g key={p.id} onClick={() => togglePanel(p.id)} className="cursor-pointer transition-all">
                  <rect
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    rx={p.rx || 4}
                    fill={isSelected ? "#E11D48" : "#1E293B"}
                    fillOpacity={isSelected ? "0.85" : "0.7"}
                    stroke={isSelected ? "#FB7185" : "#475569"}
                    strokeWidth={isSelected ? "2.5" : "1.2"}
                    className="hover:fill-slate-700 transition-colors"
                  />
                  {/* Text pe element */}
                  <text
                    x={p.x + p.w / 2}
                    y={p.y + p.h / 2 + 3}
                    fill={isSelected ? "#FFFFFF" : "#94A3B8"}
                    fontSize={p.h < 25 ? "8" : "9.5"}
                    fontWeight={isSelected ? "bold" : "600"}
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                  >
                    {isSelected ? `✓ ${p.name}` : p.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legendă / Listă rapidă de bife */}
        <div className="w-full flex-1 max-h-[310px] overflow-y-auto space-y-1 text-xs pr-1 scrollbar-thin">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-400" />
            Zone avariate selectate:
          </div>

          {selectedPanels.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic py-4 text-center">
              Atinge elementele de pe mașină (bară, capotă, portiere, jante) pentru a consemna avariile inițiale.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedPanels.map((panelId) => {
                const panel = CAR_PANELS.find((p) => p.id === panelId);
                if (!panel) return null;
                return (
                  <span
                    key={panelId}
                    onClick={() => togglePanel(panelId)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 font-semibold text-[11px] cursor-pointer hover:bg-rose-500/30 transition-all"
                    title="Apasă pentru a elimina"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    {panel.name}
                    <span className="text-[10px] opacity-60">✕</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
