import { describe, it, expect } from "vitest";
import { toDb, toDbPatch, fromDb } from "../claimDb";
import { emptyClaim } from "../claimModel";

describe("claimDb - Data Transformation & Schema Mapping", () => {
  describe("toDb", () => {
    it("transformă un claim complet în formatul de coloane snake_case pentru PostgreSQL", () => {
      const claim = {
        ...emptyClaim("in_lucru"),
        id: "claim-uuid-123",
        numarDosar: "DOS-2026-001",
        tipAsigurare: "CASCO",
        asigurator: "Generali",
        client: "Ion Popescu",
        numarInmatriculare: "B 123 ABC",
        vin: "WVWZZZ1KZ9W123456",
        kilometraj: "125000",
        valoareDevizAudatex: 6500,
        valoarePieseAudatex: 4000,
        financiar: {
          valoareDevizAudatex: 6500,
          valoareAcceptPlata: 6000,
          valoareFransiza: 500,
          manoperaTinichigerie: 1200,
          manoperaVopsitorie: 1300,
          materialeVopsitorie: 800,
        },
      };

      const row = toDb(claim);

      expect(row.id).toBe("claim-uuid-123");
      expect(row.numar_dosar).toBe("DOS-2026-001");
      expect(row.tip_asigurare).toBe("CASCO");
      expect(row.asigurator).toBe("Generali");
      expect(row.client).toBe("Ion Popescu");
      expect(row.numar_inmatriculare).toBe("B 123 ABC");
      expect(row.vin).toBe("WVWZZZ1KZ9W123456");
      expect(row.kilometraj).toBe(125000);
      expect(row.status).toBe("in_lucru");
      expect(row.financiar.valoareDevizAudatex).toBe(6500);
      expect(row.financiar.valoareAcceptPlata).toBe(6000);
      expect(row.financiar.valoareFransiza).toBe(500);
    });

    it("tratează kilometraj null sau gol corect fără a genera NaN", () => {
      const row1 = toDb({ ...emptyClaim(), kilometraj: "" });
      const row2 = toDb({ ...emptyClaim(), kilometraj: null });
      expect(row1.kilometraj).toBeNull();
      expect(row2.kilometraj).toBeNull();
    });
  });

  describe("toDbPatch", () => {
    it("construiește payload doar pentru câmpurile modificate în patch", () => {
      const claim = {
        ...emptyClaim(),
        id: "c-100",
        status: "deschidere",
        client: "Client Initial",
      };

      const patch = {
        status: "in_lucru",
        client: "Client Actualizat",
      };

      const dbPatch = toDbPatch(claim, patch, { updatedByEmail: "admin@atelier.ro" });

      expect(dbPatch.status).toBe("in_lucru");
      expect(dbPatch.client).toBe("Client Actualizat");
      expect(dbPatch.updated_by_email).toBe("admin@atelier.ro");
      expect(dbPatch.data_ultimei_actualizari).toBeDefined();
      expect(dbPatch.numar_dosar).toBeUndefined(); // nemodificat
    });
  });

  describe("fromDb", () => {
    it("mapează rândul din baza de date înapoi în obiectul camelCase Claim", () => {
      const dbRow = {
        id: "db-uuid-456",
        numar_dosar: "DOS-2026-999",
        status: "programat",
        client: "Maria Ionescu",
        numar_inmatriculare: "CJ 99 ABC",
        vin: "VF1BB000000",
        data_programare: "2026-08-20T09:00:00",
        financiar: {
          valoareDevizAudatex: 4500,
          valoareAcceptPlata: 4000,
        },
      };

      const claim = fromDb(dbRow);

      expect(claim.id).toBe("db-uuid-456");
      expect(claim.numarDosar).toBe("DOS-2026-999");
      expect(claim.status).toBe("programat");
      expect(claim.client).toBe("Maria Ionescu");
      expect(claim.numarInmatriculare).toBe("CJ 99 ABC");
      expect(claim.vin).toBe("VF1BB000000");
      expect(claim.dataProgramare).toBe("2026-08-20T09:00:00");
      expect(claim.valoareDevizAudatex).toBe(4500);
    });

    it("gestionează cazurile în care rândul este null sau undefined", () => {
      const claim = fromDb(null);
      expect(claim).toBeDefined();
      expect(claim.status).toBe("deschidere");
    });
  });
});
