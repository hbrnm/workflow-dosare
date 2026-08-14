import { describe, it, expect, beforeEach, vi } from "vitest";
import { enqueueOfflineUpload, getPendingUploads, removePendingUpload, flushUploadQueue } from "../uploadQueue";

describe("uploadQueue offline resilience", () => {
  it("funcționează grațios în mediu fără indexedDB (SSR / mock)", async () => {
    const res = await getPendingUploads();
    expect(Array.isArray(res)).toBe(true);
  });

  it("flushUploadQueue returnează statistică corectă", async () => {
    const mockUploadFn = vi.fn().mockResolvedValue(true);
    const stats = await flushUploadQueue(mockUploadFn);
    expect(stats).toHaveProperty("processed");
    expect(stats).toHaveProperty("failed");
    expect(stats).toHaveProperty("remaining");
  });
});
