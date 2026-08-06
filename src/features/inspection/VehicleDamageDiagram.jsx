import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  DAMAGE_SEVERITY,
  VEHICLE_PARTS,
  partLabel,
  severityColor,
} from "../../constants/vehicleParts";
import { uid } from "../../utils/dateUtils";

/**
 * Diagramă interactivă vehicul (vedere de sus).
 * Tap pe o zonă → marchează avarie cu severitate.
 */
export default function VehicleDamageDiagram({
  marks = [],
  onChange,
  readOnly = false,
  className = "",
}) {
  const [pendingPart, setPendingPart] = useState(null);
  const [severity, setSeverity] = useState("medie");
  const [note, setNote] = useState("");

  const marksByPart = useMemo(() => {
    const map = {};
    (marks || []).forEach((m) => {
      if (!map[m.partId]) map[m.partId] = [];
      map[m.partId].push(m);
    });
    return map;
  }, [marks]);

  const openPart = (partId) => {
    if (readOnly) return;
    setPendingPart(partId);
    setSeverity("medie");
    setNote("");
  };

  const confirmMark = () => {
    if (!pendingPart || !onChange) return;
    const next = [
      ...(marks || []),
      {
        id: uid(),
        partId: pendingPart,
        severity,
        note: note.trim(),
        createdAt: new Date().toISOString(),
      },
    ];
    onChange(next);
    setPendingPart(null);
  };

  const removeMark = (id) => {
    if (readOnly || !onChange) return;
    onChange((marks || []).filter((m) => m.id !== id));
  };

  return (
    <div className={`v2-diagram ${className}`}>
      <div className="relative mx-auto w-full max-w-sm select-none">
        <svg viewBox="0 0 100 78" className="w-full h-auto drop-shadow-sm" role="img" aria-label="Diagramă vehicul">
          {/* Siluetă caroserie */}
          <rect x="34" y="4" width="32" height="70" rx="8" fill="#1a2332" stroke="#3d4f66" strokeWidth="0.6" />
          <rect x="38" y="22" width="24" height="8" rx="1" fill="#2a3a4f" opacity="0.7" />
          <rect x="38" y="48" width="24" height="8" rx="1" fill="#2a3a4f" opacity="0.7" />

          {VEHICLE_PARTS.map((part) => {
            const hit = marksByPart[part.id];
            const color = hit?.length ? severityColor(hit[hit.length - 1].severity) : "transparent";
            const stroke = hit?.length ? severityColor(hit[hit.length - 1].severity) : "#5a6d82";
            return (
              <g key={part.id}>
                <rect
                  x={part.x}
                  y={part.y}
                  width={part.w}
                  height={part.h}
                  rx={1.5}
                  fill={hit?.length ? color : "rgba(90,109,130,0.15)"}
                  fillOpacity={hit?.length ? 0.55 : 1}
                  stroke={stroke}
                  strokeWidth={hit?.length ? 0.9 : 0.4}
                  className={readOnly ? "" : "cursor-pointer"}
                  onClick={() => openPart(part.id)}
                >
                  <title>{part.label}</title>
                </rect>
                {hit?.length > 0 && (
                  <circle
                    cx={part.x + part.w - 2}
                    cy={part.y + 2}
                    r={2.2}
                    fill={severityColor(hit[hit.length - 1].severity)}
                    stroke="#0f1419"
                    strokeWidth={0.4}
                  />
                )}
              </g>
            );
          })}

          <text x="50" y="76" textAnchor="middle" fill="#8a9bb0" fontSize="2.8">
            FAȚĂ ↑
          </text>
        </svg>
      </div>

      {!readOnly && (
        <p className="mt-2 text-center text-xs text-[var(--v2-muted)]">
          Apasă pe o zonă pentru a marca avaria
        </p>
      )}

      {(marks || []).length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {marks.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-2 rounded-lg bg-[var(--v2-surface-2)] px-3 py-2 text-sm"
            >
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: severityColor(m.severity) }}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[var(--v2-text)]">{partLabel(m.partId)}</div>
                <div className="text-xs text-[var(--v2-muted)]">
                  {DAMAGE_SEVERITY.find((s) => s.key === m.severity)?.label || m.severity}
                  {m.note ? ` — ${m.note}` : ""}
                </div>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeMark(m.id)}
                  className="rounded p-1 text-[var(--v2-muted)] hover:bg-black/10 hover:text-[var(--v2-danger)]"
                  aria-label="Șterge marcaj"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {pendingPart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-[var(--v2-surface)] p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--v2-text)]">
              Marchează: {partLabel(pendingPart)}
            </h3>
            <div className="mt-3 flex gap-2">
              {DAMAGE_SEVERITY.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSeverity(s.key)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition ${
                    severity === s.key
                      ? "border-transparent text-white"
                      : "border-[var(--v2-border)] text-[var(--v2-text)]"
                  }`}
                  style={
                    severity === s.key
                      ? { background: s.color }
                      : undefined
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
            <input
              className="v2-input mt-3"
              placeholder="Notă (opțional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="v2-btn-ghost flex-1"
                onClick={() => setPendingPart(null)}
              >
                Anulează
              </button>
              <button type="button" className="v2-btn-primary flex-1" onClick={confirmMark}>
                Adaugă
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
