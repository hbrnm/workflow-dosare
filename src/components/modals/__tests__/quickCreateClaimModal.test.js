import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("QuickCreateClaimModal document extraction & fields persistence", () => {
  const modalFilePath = resolve(__dirname, "../QuickCreateClaimModal.jsx");
  const code = readFileSync(modalFilePath, "utf8");

  it("include campurile VIN, Marca/Model, Kilometraj si lista de operatiuni in state", () => {
    expect(code).toContain("const [vin, setVin] = useState");
    expect(code).toContain("const [marcaModel, setMarcaModel] = useState");
    expect(code).toContain("const [kilometraj, setKilometraj] = useState");
    expect(code).toContain("const [operatiuni, setOperatiuni] = useState");
    expect(code).toContain("const [importedData, setImportedData] = useState");
  });

  it("handleAiDataExtracted populeaza vin, marcaModel, kilometraj si operatiuni", () => {
    expect(code).toContain("if (extractedClaim.vin) setVin(extractedClaim.vin);");
    expect(code).toContain("if (extractedClaim.marcaModel)");
    expect(code).toContain("if (extractedClaim.kilometraj != null");
    expect(code).toContain("if (Array.isArray(extractedClaim.operatiuni)");
  });

  it("handleSubmit trimite la onSave toate datele extrase", () => {
    expect(code).toContain("vin: (vin || importedData?.vin || \"\").trim().toUpperCase()");
    expect(code).toContain("marcaModel: finalMarcaModel");
    expect(code).toContain("kilometraj:");
    expect(code).toContain("operatiuni: activeOps");
    expect(code).toContain("ceEsteDeReparat: finalCeEsteDeReparat");
    expect(code).toContain("...(importedData || {})");
  });

  it("afiseaza vizual pe modal lista de operatiuni extrase si badge-uri de tip operatiune", () => {
    expect(code).toContain("Operațiuni de executat");
    expect(code).toContain("INL");
    expect(code).toContain("VOPS");
    expect(code).toContain("REP");
    expect(code).toContain("D/R");
    expect(code).toContain("handleRemoveOperation");
  });
});
