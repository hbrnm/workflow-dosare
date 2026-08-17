import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../MobileAppLayout.jsx"), "utf8");

describe("MobileAppLayout login chrome", () => {
  it("imports emailInitial so Safari does not throw Can't find variable", () => {
    expect(src).toMatch(/import\s*\{\s*emailInitial\s*\}\s*from\s*["']\.\.\/\.\.\/utils\/userDisplay["']/);
    expect(src).toMatch(/emailInitial\(userEmail\)/);
  });
});
