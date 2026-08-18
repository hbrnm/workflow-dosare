import { describe, it, expect, beforeEach } from "vitest";
import {
  getUserNickname,
  getDynamicGreetingObject,
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

  it("generates interactive greeting object without emojis", () => {
    const obj = getDynamicGreetingObject("Alex", { tot: 0, piese: 5 });
    expect(obj.text).toContain("Alex");
    expect(obj.targetStage).toBe("piese_comandate");
    expect(obj.stageLabel).toBe("Piese");
    // Ensure no emoji characters exist in message text
    expect(/[\u{1F300}-\u{1F9FF}]/u.test(obj.text)).toBe(false);
  });
});
