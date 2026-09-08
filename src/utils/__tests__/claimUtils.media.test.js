import { describe, it, expect, vi } from "vitest";
import {
  refreshStorageUrls,
  stripEphemeralMediaUrls,
  mediaItemKey,
  appendMediaItems,
  removeMediaItems,
  unionMediaLists,
  resolveMediaPatch,
  stripMediaOps,
  hasMediaOps,
  uploadStorageItem,
} from "../claimUtils";

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

describe("media merge helpers", () => {
  it("keys by path over id", () => {
    expect(mediaItemKey({ id: "1", path: "a/b.jpg" })).toBe("path:a/b.jpg");
    expect(mediaItemKey({ id: "1" })).toBe("id:1");
  });

  it("appends without dropping concurrent items", () => {
    const base = [
      { id: "a", path: "p/a.jpg" },
      { id: "b", path: "p/b.jpg" },
    ];
    const added = [{ id: "c", path: "p/c.jpg" }];
    const out = appendMediaItems(base, added);
    expect(out.map((x) => x.path)).toEqual(["p/c.jpg", "p/a.jpg", "p/b.jpg"]);
  });

  it("dedupes append by path and prefers newer metadata", () => {
    const base = [{ id: "a", path: "p/a.jpg", nume: "old" }];
    const added = [{ id: "a2", path: "p/a.jpg", nume: "new" }];
    const out = appendMediaItems(base, added);
    expect(out).toHaveLength(1);
    expect(out[0].nume).toBe("new");
  });

  it("removes by path key", () => {
    const base = [
      { id: "a", path: "p/a.jpg" },
      { id: "b", path: "p/b.jpg" },
    ];
    expect(removeMediaItems(base, [{ path: "p/a.jpg" }]).map((x) => x.path)).toEqual(["p/b.jpg"]);
  });

  it("unions primary with secondary extras", () => {
    const primary = [{ id: "a", path: "p/a.jpg" }];
    const secondary = [
      { id: "a", path: "p/a.jpg", url: "stale" },
      { id: "b", path: "p/b.jpg" },
    ];
    const out = unionMediaLists(primary, secondary);
    expect(out.map((x) => x.path)).toEqual(["p/a.jpg", "p/b.jpg"]);
    expect(out[0].url).toBeUndefined();
  });

  it("resolveMediaPatch applies append+remove against latest claim", () => {
    const claim = {
      poze: [
        { id: "1", path: "p/1.jpg" },
        { id: "2", path: "p/2.jpg" },
      ],
      documente: [{ id: "d1", path: "d/1.pdf" }],
    };
    const resolved = resolveMediaPatch(claim, {
      appendPoze: [{ id: "3", path: "p/3.jpg" }],
      removePoze: [{ path: "p/1.jpg" }],
      appendDocumente: [{ id: "d2", path: "d/2.pdf" }],
    });
    expect(resolved.poze.map((x) => x.path)).toEqual(["p/3.jpg", "p/2.jpg"]);
    expect(resolved.documente.map((x) => x.path)).toEqual(["d/2.pdf", "d/1.pdf"]);
  });

  it("stripMediaOps removes op keys but keeps other fields", () => {
    expect(stripMediaOps({ appendPoze: [{}], status: "in_lucru" })).toEqual({ status: "in_lucru" });
    expect(hasMediaOps({ appendPoze: [{ id: "1" }] })).toBe(true);
    expect(hasMediaOps({ status: "x" })).toBe(false);
  });
});

describe("uploadStorageItem", () => {
  it("uploads file to storage bucket and creates signed url", async () => {
    const uploadFn = vi.fn().mockResolvedValue({ error: null });
    const createSignedUrlFn = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://signed.storage.example/doc.pdf" },
      error: null,
    });
    const fakeClient = {
      storage: {
        from: vi.fn(() => ({
          upload: uploadFn,
          createSignedUrl: createSignedUrlFn,
        })),
      },
    };

    const mockFile = { name: "constatare.pdf", type: "application/pdf", size: 1024 };
    const result = await uploadStorageItem(fakeClient, "documente-dosare", "claim-123", mockFile, "documente");

    expect(uploadFn).toHaveBeenCalled();
    expect(createSignedUrlFn).toHaveBeenCalled();
    expect(result.nume).toBe("constatare.pdf");
    expect(result.url).toBe("https://signed.storage.example/doc.pdf");
    expect(result.path).toContain("claim-123/documente/");
  });
});
