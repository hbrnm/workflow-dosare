import { describe, it, expect } from "vitest";
import { UI_COPY, statusFolderUpper } from "../uiCopy";

describe("uiCopy", () => {
  it("keeps capture wording without & Doc leftovers", () => {
    expect(UI_COPY.fotoSiDocumente).toBe("Foto și documente");
    expect(UI_COPY.fotoSiDocumente).not.toMatch(/Foto\s*&\s*Doc/i);
    expect(UI_COPY.cautareDosar).toBe("Căutare dosar");
  });

  it("uppercases stage folders with Romanian diacritics", () => {
    expect(statusFolderUpper("Acord reparație")).toBe("ACORD REPARAȚIE");
    expect(statusFolderUpper("Programări")).toBe("PROGRAMĂRI");
  });
});
