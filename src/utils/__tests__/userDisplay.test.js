import { describe, expect, it } from "vitest";
import { emailInitial } from "../userDisplay";

describe("emailInitial", () => {
  it("returns the first letter of the logged-in email", () => {
    expect(emailInitial("laura@atelier.ro")).toBe("L");
    expect(emailInitial("  bogdan@x.ro")).toBe("B");
  });

  it("returns ? when email is missing", () => {
    expect(emailInitial("")).toBe("?");
    expect(emailInitial(null)).toBe("?");
  });
});
