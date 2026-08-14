import { describe, it, expect } from "vitest";
import {
  sanitizeExportToken,
  buildGdprExportFilename,
  summarizeGdprBundle,
} from "../gdprExport";

describe("gdprExport", () => {
  it("sanitizes filename tokens", () => {
    expect(sanitizeExportToken("Atelier A!")).toBe("atelier-a");
    expect(sanitizeExportToken("")).toBe("atelier");
  });

  it("builds export filename", () => {
    expect(buildGdprExportFilename({ slug: "default", date: "2026-08-09" })).toBe(
      "gdpr-export-default-2026-08-09.json"
    );
  });

  it("summarizes bundle counts", () => {
    expect(
      summarizeGdprBundle({
        dosare: [{}, {}],
        arhiva: [{}],
        membri: [{}, {}, {}],
        istoric: [],
      })
    ).toEqual({ dosare: 2, arhiva: 1, membri: 3, istoric: 0 });
  });
});
