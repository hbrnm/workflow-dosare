import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  toLocalDateKey,
  toLocalTimeHHMM,
  calendarDaysBetween,
  formatDaysLabel,
  getSinceMeta,
} from "../dateUtils";

describe("stage since date helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T10:00:00"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("toLocalDateKey keeps naive datetime calendar day", () => {
    expect(toLocalDateKey("2026-08-07T22:30:00")).toBe("2026-08-07");
    expect(toLocalDateKey("2026-08-07")).toBe("2026-08-07");
  });

  it("toLocalTimeHHMM reads naive time", () => {
    expect(toLocalTimeHHMM("2026-08-07T22:30:00")).toBe("22:30");
    expect(toLocalTimeHHMM("2026-08-07")).toBe("");
  });

  it("calendarDaysBetween is day-based, not hour-based", () => {
    expect(calendarDaysBetween("2026-08-07", "2026-08-08")).toBe(1);
    expect(calendarDaysBetween("2026-08-08", "2026-08-08")).toBe(0);
    expect(calendarDaysBetween("2026-08-06", "2026-08-08")).toBe(2);
  });

  it("getSinceMeta keeps date and days in sync", () => {
    // Yesterday evening still counts as 1 calendar day, not "azi"
    const meta = getSinceMeta("2026-08-07T22:30:00");
    expect(meta.dateLabel).toBe("07/08/2026");
    expect(meta.timeLabel).toBe("22:30");
    expect(meta.dateTimeShort).toBe("07/08 22:30");
    expect(meta.days).toBe(1);
    expect(meta.daysLabel).toBe("1 zi");
    expect(formatDaysLabel(0)).toBe("azi");
  });

  it("getSinceMeta today is azi", () => {
    const meta = getSinceMeta("2026-08-08T09:15:00");
    expect(meta.dateLabel).toBe("08/08/2026");
    expect(meta.dateTimeShort).toBe("08/08 09:15");
    expect(meta.daysLabel).toBe("azi");
  });

  it("UTC midnight edge uses local calendar day (not slice UTC)", () => {
    // 2026-08-07T21:00:00.000Z = 08/08 00:00 in Europe/Bucharest (UTC+3)
    const meta = getSinceMeta("2026-08-07T21:00:00.000Z");
    const localDay = toLocalDateKey("2026-08-07T21:00:00.000Z");
    expect(meta.dateTimeShort.startsWith(localDay.slice(8, 10) + "/" + localDay.slice(5, 7))).toBe(true);
    expect(meta.days).toBe(calendarDaysBetween(localDay, "2026-08-08"));
    expect(meta.daysLabel).toBe(formatDaysLabel(meta.days));
  });
});

