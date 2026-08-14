import React, { useMemo } from "react";
import { PIPELINE_PHASES, getStatusDefinition, getPhaseColors } from "../../constants/config";
import { canChangeStatus } from "../../constants/roles";

/** Flux pe faze — mutare rapidă de status (tabletă / desktop). */
export default function FluxBoard({ claims, role, onOpen, onMoveStatus }) {
  const canMove = canChangeStatus(role);

  const byStatus = useMemo(() => {
    const map = {};
    (claims || []).forEach((c) => {
      const key = getStatusDefinition(c.status).key;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [claims]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--v2-border)] px-4 py-3">
        <h1 className="font-[family-name:var(--v2-font-display)] text-xl font-bold text-[var(--v2-text)]">
          Flux operațional
        </h1>
        <p className="text-xs text-[var(--v2-muted)]">Dosare pe faze — apasă pentru detalii, săgețile mută statusul</p>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-max gap-3 p-3 md:min-w-0 md:grid md:grid-cols-2 xl:grid-cols-4">
          {PIPELINE_PHASES.map((phase) => {
            const phaseClaims = phase.statuses.flatMap((s) => byStatus[s] || []);
            return (
              <section
                key={phase.key}
                className="flex w-[280px] shrink-0 flex-col rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] md:w-auto"
              >
                <header
                  className="rounded-t-xl px-3 py-2 text-white"
                  style={{ background: phase.barColor }}
                >
                  <div className="text-xs font-bold uppercase tracking-wide">{phase.label}</div>
                  <div className="text-[10px] opacity-80">{phaseClaims.length} dosare</div>
                </header>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                  {phaseClaims.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-[var(--v2-muted)]">Gol</p>
                  ) : (
                    phaseClaims.map((c) => {
                      const st = getStatusDefinition(c.status);
                      const colors = getPhaseColors(c.status);
                      const idx = phase.statuses.indexOf(st.key);
                      const prev = idx > 0 ? phase.statuses[idx - 1] : null;
                      // next within phase or first of next phase
                      let next = idx >= 0 && idx < phase.statuses.length - 1 ? phase.statuses[idx + 1] : null;
                      if (!next) {
                        const pi = PIPELINE_PHASES.findIndex((p) => p.key === phase.key);
                        next = PIPELINE_PHASES[pi + 1]?.statuses?.[0] || null;
                      }
                      return (
                        <article
                          key={c.id}
                          className="rounded-lg border border-[var(--v2-border)] bg-[var(--v2-bg)] p-2.5"
                        >
                          <button type="button" className="w-full text-left" onClick={() => onOpen(c.id)}>
                            <div className="font-semibold text-[var(--v2-text)]">
                              {c.numarInmatriculare || "—"}
                            </div>
                            <div className="truncate text-xs text-[var(--v2-muted)]">
                              {[c.client, c.marca || c.marcaModel].filter(Boolean).join(" · ") || "Fără detalii"}
                            </div>
                            <span
                              className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                              style={{ background: colors.bg }}
                            >
                              {st.num}. {st.label}
                            </span>
                          </button>
                          {canMove && (
                            <div className="mt-2 flex gap-1">
                              <button
                                type="button"
                                className="v2-btn-ghost flex-1 !py-1 text-[10px]"
                                disabled={!prev}
                                onClick={() => prev && onMoveStatus?.(c, prev)}
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                className="v2-btn-secondary flex-1 !py-1 text-[10px]"
                                disabled={!next}
                                onClick={() => next && onMoveStatus?.(c, next)}
                              >
                                Înainte →
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
