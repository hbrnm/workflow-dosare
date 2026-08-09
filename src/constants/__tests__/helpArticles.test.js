import { describe, it, expect } from "vitest";
import { HELP_ARTICLES, getHelpArticle } from "../helpArticles";

describe("helpArticles", () => {
  it("has the three core SaaS guides", () => {
    expect(HELP_ARTICLES.map((a) => a.id)).toEqual([
      "primul-dosar",
      "programare",
      "alerte",
    ]);
  });

  it("every article has title, summary and steps", () => {
    HELP_ARTICLES.forEach((a) => {
      expect(a.title.length).toBeGreaterThan(3);
      expect(a.summary.length).toBeGreaterThan(3);
      expect(a.body.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("getHelpArticle resolves and misses gracefully", () => {
    expect(getHelpArticle("alerte")?.title).toMatch(/alerte/i);
    expect(getHelpArticle("missing")).toBeNull();
  });
});
