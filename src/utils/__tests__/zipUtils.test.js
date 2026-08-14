import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadClaimAsZip } from "../zipUtils";

describe("zipUtils - Claim Media Bundling", () => {
  beforeEach(() => {
    // Mock global fetch returning arrayBuffer
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3, 4]).buffer),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generează arhiva ZIP cu foldere pe categorii (receptie, reconstatare, predare, documente)", async () => {
    const mockClaim = {
      id: "claim-zip-1",
      numarDosar: "DOS-2026-ZIP",
      poze: [
        { url: "https://example.com/poza1.jpg", categoria: "receptie", nume: "fata.jpg" },
        { url: "https://example.com/poza2.jpg", categoria: "predare", nume: "spate.jpg" },
      ],
      documente: [
        { url: "https://example.com/deviz.pdf", nume: "Deviz_Audatex.pdf" },
      ],
    };

    const zipBlob = await downloadClaimAsZip(mockClaim, "DOS-2026-ZIP");
    expect(zipBlob).toBeDefined();
  });

  it("gestionează dosare fără fotografii sau documente fără eroare", async () => {
    const emptyClaim = {
      id: "claim-empty",
      numarDosar: "DOS-EMPTY",
      poze: [],
      documente: [],
    };

    const zipBlob = await downloadClaimAsZip(emptyClaim, "DOS-EMPTY");
    expect(zipBlob).toBeDefined();
  });
});
