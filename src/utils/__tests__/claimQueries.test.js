import { describe, it, expect, vi } from "vitest";
import { CLAIM_LIST_COLUMNS, fetchClaimsKeyset, fetchClaimMediaLazy } from "../claimQueries";

describe("claimQueries - Database Optimization & Lazy Loading", () => {
  it("conține lista optimizată de coloane pentru interogări rapide de listă", () => {
    expect(CLAIM_LIST_COLUMNS).toBeDefined();
    expect(CLAIM_LIST_COLUMNS).toContain("id");
    expect(CLAIM_LIST_COLUMNS).toContain("status");
    expect(CLAIM_LIST_COLUMNS).toContain("numar_inmatriculare");
    expect(CLAIM_LIST_COLUMNS).toContain("poze");
    expect(CLAIM_LIST_COLUMNS).toContain("documente");
    expect(CLAIM_LIST_COLUMNS).toContain("note");
    expect(CLAIM_LIST_COLUMNS).toContain("devize");
    expect(CLAIM_LIST_COLUMNS).toContain("created_at");
  });

  it("fetchClaimsKeyset returnează structura corectă de paginare O(1)", async () => {
    const mockRows = [
      { id: "c1", created_at: "2026-08-14T10:00:00Z", status: "deschidere", numar_inmatriculare: "B 101 ABC" },
      { id: "c2", created_at: "2026-08-14T09:00:00Z", status: "in_lucru", numar_inmatriculare: "B 102 XYZ" },
    ];

    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      then: vi.fn((resolve) => resolve({ data: mockRows, error: null })),
    };

    const mockSupabase = {
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    };

    const res = await fetchClaimsKeyset(mockSupabase, { limit: 2 });
    expect(res).toHaveProperty("claims");
    expect(res).toHaveProperty("nextCursor");
    expect(res.claims.length).toBe(2);
    expect(res.hasMore).toBe(false);
  });

  it("fetchClaimMediaLazy încarcă media la cerere pentru un dosar", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "c1",
                poze: [{ id: "p1", url: "https://example.com/p1.jpg" }],
                documente: [],
                devize: [],
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const media = await fetchClaimMediaLazy(mockSupabase, "c1");
    expect(media.poze.length).toBe(1);
    expect(media.documente).toEqual([]);
  });
});
