import { describe, it, expect, beforeEach } from "vitest";
import {
  getUserNickname,
  setUserNickname,
  getDynamicGreetingMessage,
} from "../userNickname";

describe("userNickname utility", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("returns default clean nickname from email if none saved", () => {
    expect(getUserNickname("alex.popescu@service.ro")).toBe("Alex popescu");
    expect(getUserNickname("mihai@garage.com")).toBe("Mihai");
    expect(getUserNickname("")).toBe("Alex");
  });

  it("generates time-of-day greeting message with nickname", () => {
    const msg = getDynamicGreetingMessage("Alex", { tot: 10, piese: 3 });
    expect(msg).toContain("Alex");
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(5);
  });
});
