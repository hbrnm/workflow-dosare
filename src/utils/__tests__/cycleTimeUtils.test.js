import { describe, it, expect } from "vitest";
import {
  daysBetweenDates,
  computeClaimCycleTimes,
  computeFleetCycleMetrics,
} from "../cycleTimeUtils";

describe("cycleTimeUtils - Durată Medie de Reparație & SLA", () => {
  it("calculează corect diferența în zile între două date fixe", () => {
    expect(daysBetweenDates("2026-01-01", "2026-01-05")).toBe(4);
    expect(daysBetweenDates("2026-01-10", "2026-01-10")).toBe(0);
    expect(daysBetweenDates(null, "2026-01-05")).toBe(0);
  });

  it("calculează durata de reparație pentru un dosar finalizat", () => {
    const claim = {
      id: "dosar-1",
      dataDeschiderii: "2026-02-01",
      dataProgramare: "2026-02-03",
      dataGataRidicare: "2026-02-07",
      status: "facturat",
      financiar: { dataFactura: "2026-02-08" },
      dataIncasarii: "2026-02-18",
    };

    const cycle = computeClaimCycleTimes(claim);
    expect(cycle.isFinished).toBe(true);
    expect(cycle.durataReparatieZile).toBe(4); // 3 feb -> 7 feb
    expect(cycle.durataTotalaCicluZile).toBe(7); // 1 feb -> 8 feb
    expect(cycle.durataIncasareZile).toBe(10); // 8 feb -> 18 feb
  });

  it("calculează media flotei și calificativul SLA", () => {
    const claims = [
      {
        id: "d1",
        dataProgramare: "2026-02-01",
        dataGataRidicare: "2026-02-04", // 3 zile
        status: "facturat",
      },
      {
        id: "d2",
        dataProgramare: "2026-02-01",
        dataGataRidicare: "2026-02-06", // 5 zile
        status: "facturat",
      },
    ];

    const metrics = computeFleetCycleMetrics(claims);
    expect(metrics.completedRepairsCount).toBe(2);
    expect(metrics.avgRepairDays).toBe(4);
    expect(metrics.benchmarkRating).toContain("Rapid (SLA Excelent)");
  });
});
