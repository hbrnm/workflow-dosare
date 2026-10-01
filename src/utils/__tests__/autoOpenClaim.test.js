import { describe, it, expect, vi } from "vitest";
import { openAutoClaim } from "../autoOpenClaim";
import { emptyClaim } from "../claimModel";

describe("openAutoClaim", () => {
  it("dosar proaspăt creat (încă absent din state) se deschide ca existent, nu prin openNew", () => {
    const openExisting = vi.fn();
    const openNew = vi.fn();
    const draft = { ...emptyClaim("constatare"), numarInmatriculare: "B 123 ABC", observatii: "Creat automat" };
    expect(openAutoClaim(draft, { openExisting, openNew })).toBe("existing");
    expect(openExisting).toHaveBeenCalledWith(draft);
    expect(openNew).not.toHaveBeenCalled();
  });

  it("fără id: openNew primește doar un status string, niciodată obiectul", () => {
    const openExisting = vi.fn();
    const openNew = vi.fn();
    openAutoClaim({ status: "deschidere" }, { openExisting, openNew });
    expect(openNew).toHaveBeenCalledWith("deschidere");
    openAutoClaim({ status: { x: 1 } }, { openExisting, openNew });
    expect(openNew).toHaveBeenLastCalledWith(undefined);
    openAutoClaim(null, { openExisting, openNew });
    expect(openNew).toHaveBeenLastCalledWith(undefined);
    expect(openExisting).not.toHaveBeenCalled();
  });
});
