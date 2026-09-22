import { describe, it, expect } from "vitest";
import { buildAtelierFunnel } from "../atelierFunnel";

describe("buildAtelierFunnel", () => {
  it("computes create → programare → alerte rates", () => {
    const claims = [
      { id: "1", numarInmatriculare: "B111AAA", dataProgramare: "2026-08-01T09:00:00", blocat: false, status: "deschidere", dataSchimbareStatus: new Date().toISOString(), termenAlertaZile: 99 },
      { id: "2", numarInmatriculare: "B111AAA", dataProgramare: "2026-08-01T10:00:00", blocat: true, status: "deschidere", dataSchimbareStatus: new Date().toISOString(), termenAlertaZile: 99 },
      { id: "3", numarInmatriculare: "B222BBB", dataProgramare: "2026-08-02T10:00:00", blocat: false, status: "deschidere", dataSchimbareStatus: new Date().toISOString(), termenAlertaZile: 99 },
    ];
    const funnel = buildAtelierFunnel(claims);
    expect(funnel.created).toBe(3);
    expect(funnel.withProgramare).toBe(2);
    expect(funnel.withAlert).toBe(1);
    expect(funnel.programareRate).toBe(67);
    expect(funnel.steps.map((s) => s.id)).toEqual(["create", "programare", "alerte"]);
  });

  it("handles empty list", () => {
    const funnel = buildAtelierFunnel([]);
    expect(funnel.created).toBe(0);
    expect(funnel.programareRate).toBeNull();
  });
});
