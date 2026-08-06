import { describe, it, expect } from "vitest";
import { getFluxExportClaims, groupAndSortStageClaims } from "../fluxClaimSort";

describe("fluxClaimSort", () => {
  const claims = [
    { id: "1", numarInmatriculare: "B111AAA", status: "deschidere", dataSchimbareStatus: "2026-08-01", blocat: false },
    { id: "2", numarInmatriculare: "B222BBB", status: "deschidere", dataSchimbareStatus: "2026-08-05", blocat: true },
    { id: "3", numarInmatriculare: "B333CCC", status: "piese_comandate", dataSchimbareStatus: "2026-08-03", blocat: false },
  ];

  it("exports one stage when focusedStage is set", () => {
    const exported = getFluxExportClaims(claims, { focusedStage: "deschidere" });
    expect(exported).toHaveLength(2);
    expect(exported.every((c) => c.status === "deschidere")).toBe(true);
  });

  it("exports all visible stages in pipeline order when unfiltered", () => {
    const exported = getFluxExportClaims(claims, { focusedStage: null });
    expect(exported).toHaveLength(3);
    expect(exported[0].status).toBe("deschidere");
    expect(exported[2].status).toBe("piese_comandate");
  });

  it("sorts blocked claims before others in the same stage", () => {
    const grouped = groupAndSortStageClaims(
      claims.filter((c) => c.status === "deschidere"),
      "alerte",
      4,
    );
    const flat = grouped.flatMap(([, g]) => g);
    expect(flat[0].id).toBe("2");
  });
});
