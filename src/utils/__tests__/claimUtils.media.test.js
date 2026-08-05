import { describe, it, expect, vi } from "vitest";
import { refreshStorageUrls, stripEphemeralMediaUrls } from "../claimUtils";

describe("refreshStorageUrls", () => {
  it("renews signed http URLs when path exists", async () => {
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [{ signedUrl: "https://fresh.example/a.jpg" }],
      error: null,
    });
    const supabase = {
      storage: {
        from: () => ({ createSignedUrls }),
      },
    };

    const items = [
      {
        id: "1",
        path: "claim/poze/a.jpg",
        url: "https://expired.example/a.jpg?token=old",
      },
    ];

    const refreshed = await refreshStorageUrls(items, "poze-dosare", supabase);
    expect(createSignedUrls).toHaveBeenCalled();
    expect(refreshed[0].url).toBe("https://fresh.example/a.jpg");
    expect(refreshed[0].path).toBe("claim/poze/a.jpg");
  });

  it("keeps data: URLs without calling storage", async () => {
    const createSignedUrls = vi.fn();
    const supabase = {
      storage: {
        from: () => ({ createSignedUrls }),
      },
    };
    const items = [{ id: "1", url: "data:image/jpeg;base64,abc" }];
    const refreshed = await refreshStorageUrls(items, "poze-dosare", supabase);
    expect(createSignedUrls).not.toHaveBeenCalled();
    expect(refreshed[0].url).toMatch(/^data:/);
  });
});

describe("stripEphemeralMediaUrls", () => {
  it("removes http urls when path is present", () => {
    const out = stripEphemeralMediaUrls([
      { id: "1", path: "a/b.jpg", url: "https://x", nume: "b.jpg" },
    ]);
    expect(out[0].path).toBe("a/b.jpg");
    expect(out[0].url).toBeUndefined();
    expect(out[0].nume).toBe("b.jpg");
  });

  it("keeps data urls", () => {
    const out = stripEphemeralMediaUrls([{ id: "1", url: "data:image/png;base64,xx" }]);
    expect(out[0].url).toMatch(/^data:/);
  });
});
