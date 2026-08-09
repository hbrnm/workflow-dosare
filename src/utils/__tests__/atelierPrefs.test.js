import { describe, it, expect } from "vitest";
import { resolveActiveMembership, readAtelierSlugFromUrl } from "../atelierPrefs";

describe("atelierPrefs", () => {
  it("reads slug from query", () => {
    expect(readAtelierSlugFromUrl("?atelier=Service-Rapid&x=1")).toBe("service-rapid");
    expect(readAtelierSlugFromUrl("")).toBeNull();
  });

  it("resolves by slug, then id, then admin rank", () => {
    const memberships = [
      { atelier_id: "1", role: "operator", atelier: { slug: "a" } },
      { atelier_id: "2", role: "admin", atelier: { slug: "b" } },
    ];
    expect(resolveActiveMembership(memberships, { preferredSlug: "a" })?.atelier_id).toBe("1");
    expect(resolveActiveMembership(memberships, { preferredId: "2" })?.atelier_id).toBe("2");
    expect(resolveActiveMembership(memberships)?.atelier_id).toBe("2");
  });
});
