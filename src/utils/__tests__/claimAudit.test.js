import { describe, it, expect } from "vitest";
import {
  getClaimAuditMeta,
  filterIstoricModificari,
  ISTORIC_NOISE_FIELDS,
} from "../claimAudit";

describe("claimAudit", () => {
  it("reads authorship fields with trim and fallbacks", () => {
    expect(getClaimAuditMeta(null)).toEqual({
      createdByEmail: "",
      updatedByEmail: "",
      updatedAt: null,
    });
    expect(
      getClaimAuditMeta({
        createdByEmail: "  a@x.ro ",
        updatedByEmail: "b@x.ro",
        dataUltimeiActualizari: "2026-08-01T10:00:00",
      })
    ).toEqual({
      createdByEmail: "a@x.ro",
      updatedByEmail: "b@x.ro",
      updatedAt: "2026-08-01T10:00:00",
    });
    expect(
      getClaimAuditMeta({
        dataDeschiderii: "2026-07-01",
      }).updatedAt
    ).toBe("2026-07-01");
  });

  it("strips noise columns from istoric diffs", () => {
    expect(ISTORIC_NOISE_FIELDS.has("updated_by_email")).toBe(true);
    const filtered = filterIstoricModificari({
      status: { old: "air", new: "programat" },
      updated_by_email: { old: "a", new: "b" },
      data_ultimei_actualizari: { old: "1", new: "2" },
      _creat: true,
    });
    expect(Object.keys(filtered).sort()).toEqual(["_creat", "status"]);
  });
});
