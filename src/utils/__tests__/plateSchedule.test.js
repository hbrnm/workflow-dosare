import { describe, it, expect } from "vitest";
import {
  normalizePlate,
  isCoScheduleEligible,
  findCoScheduleSiblings,
  groupClaimsByPlate,
  groupClaimsByPlateAndSchedule,
  countUniqueVehicles,
  countClaimsForStatus,
  buildStatusCounts,
} from "../plateSchedule";

describe("plateSchedule", () => {
  it("normalizes plates", () => {
    expect(normalizePlate(" b-123-abc ")).toBe("B-123-ABC");
  });

  it("marks awaiting / programat siblings eligible", () => {
    expect(isCoScheduleEligible({ status: "piese_comandate", pieseSosite: true })).toBe(true);
    expect(isCoScheduleEligible({ status: "programat" })).toBe(true);
    expect(isCoScheduleEligible({ status: "in_lucru" })).toBe(true);
    expect(isCoScheduleEligible({ status: "facturat" })).toBe(false);
    expect(isCoScheduleEligible({ status: "deschidere" })).toBe(false);
    expect(isCoScheduleEligible({ status: "gata_de_ridicare", dataProgramare: "2026-08-10T09:00:00" })).toBe(true);
    expect(isCoScheduleEligible({ status: "gata_de_ridicare" })).toBe(false);
  });

  it("finds same-plate siblings for set mode", () => {
    const primary = { id: "1", numarInmatriculare: "B111AAA", status: "piese_comandate", pieseSosite: true };
    const claims = [
      primary,
      { id: "2", numarInmatriculare: "b111aaa", status: "piese_comandate", pieseSosite: true },
      { id: "3", numarInmatriculare: "B222BBB", status: "piese_comandate", pieseSosite: true },
      { id: "4", numarInmatriculare: "B111AAA", status: "facturat" },
    ];
    const sibs = findCoScheduleSiblings(claims, primary, { mode: "set" });
    expect(sibs.map((c) => c.id)).toEqual(["2"]);
  });

  it("clear mode only matches same previous datetime", () => {
    const primary = {
      id: "1",
      numarInmatriculare: "B111AAA",
      status: "programat",
      dataProgramare: "2026-08-10T09:00:00",
    };
    const claims = [
      primary,
      { id: "2", numarInmatriculare: "B111AAA", status: "programat", dataProgramare: "2026-08-10T09:00:00" },
      { id: "3", numarInmatriculare: "B111AAA", status: "programat", dataProgramare: "2026-08-11T09:00:00" },
    ];
    const sibs = findCoScheduleSiblings(claims, primary, {
      mode: "clear",
      previousDate: "2026-08-10T09:00:00",
    });
    expect(sibs.map((c) => c.id)).toEqual(["2"]);
  });

  it("groups by plate and by plate+schedule", () => {
    const claims = [
      { id: "1", numarInmatriculare: "B111AAA", dataProgramare: "2026-08-10T09:00:00" },
      { id: "2", numarInmatriculare: "B111AAA", dataProgramare: "2026-08-10T09:00:00" },
      { id: "3", numarInmatriculare: "B111AAA", dataProgramare: "2026-08-10T10:00:00" },
    ];
    expect(groupClaimsByPlate(claims)).toHaveLength(1);
    expect(groupClaimsByPlate(claims)[0]).toHaveLength(3);
    const bySlot = groupClaimsByPlateAndSchedule(claims);
    expect(bySlot).toHaveLength(2);
    expect(bySlot.find((g) => g.length === 2).map((c) => c.id).sort()).toEqual(["1", "2"]);
  });

  it("counts unique vehicles and dedupes programat/in_lucru by plate", () => {
    const claims = [
      { id: "1", numarInmatriculare: "B111AAA", status: "programat" },
      { id: "2", numarInmatriculare: "B111AAA", status: "programat" },
      { id: "3", numarInmatriculare: "B222BBB", status: "programat" },
      { id: "4", numarInmatriculare: "B333CCC", status: "in_lucru" },
      { id: "5", numarInmatriculare: "B333CCC", status: "in_lucru" },
      { id: "6", numarInmatriculare: "B444DDD", status: "deschidere" },
      { id: "7", numarInmatriculare: "B444DDD", status: "deschidere" },
      { id: "8", numarInmatriculare: "B555EEE", status: "chemat_lucru" }, // legacy → programat
      { id: "9", numarInmatriculare: "B555EEE", status: "programat" },
    ];
    expect(countUniqueVehicles(claims.filter((c) => c.status === "programat"))).toBe(3);
    expect(countClaimsForStatus(claims, "programat")).toBe(3);
    expect(countClaimsForStatus(claims, "in_lucru")).toBe(1);
    expect(countClaimsForStatus(claims, "deschidere")).toBe(2);

    const counts = buildStatusCounts(claims);
    expect(counts.programat).toBe(3);
    expect(counts.in_lucru).toBe(1);
    expect(counts.deschidere).toBe(2);
  });
});
