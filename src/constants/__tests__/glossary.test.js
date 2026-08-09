import { describe, it, expect } from "vitest";
import { GLOSSARY, glossaryForStatus, glossaryTitle } from "../glossary";

describe("glossary", () => {
  it("covers pipeline shorts AIR and AP", () => {
    expect(GLOSSARY.deschidere.short).toBe("AIR");
    expect(GLOSSARY.accept_plata.short).toBe("AP");
    expect(GLOSSARY.sosite.short).toBe("Sosite");
  });

  it("glossaryTitle joins title and hint", () => {
    const t = glossaryTitle("deschidere");
    expect(t).toContain("AIR");
    expect(t).toContain("reparație");
  });

  it("returns null for unknown keys", () => {
    expect(glossaryForStatus("xyz")).toBeNull();
    expect(glossaryTitle("xyz")).toBeUndefined();
  });
});
