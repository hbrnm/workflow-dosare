import { describe, it, expect } from "vitest";
import { resolveSessionPhotoFolder, isPhotoFolderKey } from "../scanUtils";

describe("resolveSessionPhotoFolder", () => {
  it("asks for a folder on the first photo of a session", () => {
    expect(resolveSessionPhotoFolder({})).toEqual({ ask: true, folder: null });
    expect(resolveSessionPhotoFolder({ sessionFolder: "generale" })).toEqual({
      ask: true,
      folder: null,
    });
  });

  it("reuses the locked folder for later photos in the same session", () => {
    expect(resolveSessionPhotoFolder({ sessionFolder: "receptie" })).toEqual({
      ask: false,
      folder: "receptie",
    });
    expect(resolveSessionPhotoFolder({ sessionFolder: "predare" })).toEqual({
      ask: false,
      folder: "predare",
    });
  });

  it("does not ask during document scan", () => {
    expect(
      resolveSessionPhotoFolder({ isScan: true, fallback: "scan_crop" })
    ).toEqual({ ask: false, folder: "scan_crop" });
  });

  it("accepts only known photo folders", () => {
    expect(isPhotoFolderKey("receptie")).toBe(true);
    expect(isPhotoFolderKey("reconstatare")).toBe(true);
    expect(isPhotoFolderKey("predare")).toBe(true);
    expect(isPhotoFolderKey("scan_crop")).toBe(false);
    expect(isPhotoFolderKey("")).toBe(false);
  });
});
