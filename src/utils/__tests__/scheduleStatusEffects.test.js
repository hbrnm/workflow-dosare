import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { applyScheduleStatusEffects, isAwaitingSchedule } from "../scheduleStatusEffects";

describe("scheduleStatusEffects programareStatus", () => {
  it("clears programareStatus when rescheduling", () => {
    const { patch } = applyScheduleStatusEffects(
      { id: "1", status: "programat", dataProgramare: "2026-08-10T09:00:00", programareStatus: "onorata" },
      { dataProgramare: "2026-08-12T10:00:00" }
    );
    expect(patch.programareStatus).toBeNull();
  });
});

describe("scheduleStatusEffects", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-05T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("isAwaitingSchedule detects parts-ready claims", () => {
    expect(isAwaitingSchedule({ status: "piese_comandate" })).toBe(true);
    expect(isAwaitingSchedule({ status: "in_lucru", pieseSosite: true })).toBe(true);
    expect(isAwaitingSchedule({ status: "accept_plata" })).toBe(false);
  });

  it("promotes parts-ready claim to programat when date is set", () => {
    const { patch, notices } = applyScheduleStatusEffects(
      { id: "1", status: "piese_comandate", pieseSosite: true },
      { dataProgramare: "2026-08-10T09:00:00" }
    );
    expect(patch.status).toBe("programat");
    expect(patch.dataProgramare).toBe("2026-08-10T09:00:00");
    expect(notices[0]).toMatch(/Programat/);
  });

  it("does not demote in_lucru when reschedule sends status programat", () => {
    const { patch } = applyScheduleStatusEffects(
      { id: "1", status: "in_lucru", dataProgramare: "2026-08-09T09:00:00" },
      { dataProgramare: "2026-08-12T10:00:00", status: "programat" }
    );
    expect(patch.dataProgramare).toBe("2026-08-12T10:00:00");
    expect(patch.status).toBeUndefined();
  });

  it("does not demote gata_de_ridicare on reschedule", () => {
    const { patch } = applyScheduleStatusEffects(
      { id: "1", status: "gata_de_ridicare", dataProgramare: "2026-08-01T09:00:00" },
      { dataProgramare: "2026-08-02T09:00:00", status: "programat" }
    );
    expect(patch.status).toBeUndefined();
  });

  it("clears appointment on programat → back to piese_comandate", () => {
    const { patch, notices } = applyScheduleStatusEffects(
      { id: "1", status: "programat", pieseSosite: true, dataProgramare: "2026-08-10T09:00:00" },
      { dataProgramare: null }
    );
    expect(patch.status).toBe("piese_comandate");
    expect(patch.dataProgramare).toBeNull();
    expect(notices[0]).toMatch(/anulată/);
  });

  it("does not change status when clearing date on in_lucru", () => {
    const { patch } = applyScheduleStatusEffects(
      { id: "1", status: "in_lucru", dataProgramare: "2026-08-10T09:00:00" },
      { dataProgramare: null }
    );
    expect(patch.status).toBeUndefined();
    expect(patch.dataProgramare).toBeNull();
  });

  it("promotes programat → in_lucru when adusaFizic is set", () => {
    const { patch, notices } = applyScheduleStatusEffects(
      { id: "1", status: "programat" },
      { adusaFizic: true }
    );
    expect(patch.status).toBe("in_lucru");
    expect(notices[0]).toMatch(/În lucru/);
  });

  it("sets adusaFizic when moving explicitly to in_lucru from programat", () => {
    const { patch } = applyScheduleStatusEffects(
      { id: "1", status: "programat" },
      { status: "in_lucru" }
    );
    expect(patch.status).toBe("in_lucru");
    expect(patch.adusaFizic).toBe(true);
    expect(patch.dataAdusaFizic).toBeTruthy();
  });
});
