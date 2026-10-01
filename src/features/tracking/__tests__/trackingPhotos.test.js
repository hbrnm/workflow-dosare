import { describe, it, expect, vi } from "vitest";
import { fetchTrackingPhotos } from "../trackingPhotos";

const client = (result) => ({ functions: { invoke: vi.fn().mockResolvedValue(result) } });

describe("fetchTrackingPhotos", () => {
  it("returnează pozele cu URL semnat", async () => {
    const c = client({ data: { photos: [{ id: "1", path: "a/b.jpg", url: "https://s/1" }, { id: "2", path: "x" }] }, error: null });
    const res = await fetchTrackingPhotos(c, "TK-ABCDE12345");
    expect(res).toEqual([{ id: "1", path: "a/b.jpg", url: "https://s/1" }]);
    expect(c.functions.invoke).toHaveBeenCalledWith("tracking-photos", { body: { token: "TK-ABCDE12345" } });
  });

  it("listă goală = funcția a răspuns, fără poze (nu cade pe URL-uri publice)", async () => {
    expect(await fetchTrackingPhotos(client({ data: { photos: [] }, error: null }), "t")).toEqual([]);
  });

  it("eroare / funcție nedeployată → null (fallback pe calea veche)", async () => {
    expect(await fetchTrackingPhotos(client({ data: null, error: { message: "404" } }), "t")).toBeNull();
    expect(await fetchTrackingPhotos(client({ data: {}, error: null }), "t")).toBeNull();
  });

  it("excepție la apel → null", async () => {
    const c = { functions: { invoke: vi.fn().mockRejectedValue(new Error("net")) } };
    expect(await fetchTrackingPhotos(c, "t")).toBeNull();
  });
});
