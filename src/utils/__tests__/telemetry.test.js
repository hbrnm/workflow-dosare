import { describe, it, expect, vi } from "vitest";
import { telemetry } from "../telemetry";

describe("telemetry & error sanitization", () => {
  it("sanitizează token-urile Bearer, CNP-ul și parolele din string-uri", () => {
    const dirty = "Eroare cu Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz și CNP 1900101123456 și password: 'SecretPassword123'";
    const clean = telemetry.sanitizeString(dirty);

    expect(clean).not.toContain("SecretPassword123");
    expect(clean).not.toContain("1900101123456");
    expect(clean).toContain("[REDACTED_TOKEN]");
    expect(clean).toContain("[REDACTED_CNP]");
    expect(clean).toContain("password=[REDACTED_PASSWORD]");
  });

  it("stochează breadcrumbs până la limita maximă", () => {
    telemetry.addBreadcrumb("ui.click", "Click buton test");
    telemetry.addBreadcrumb("navigation", "Navigare către brief");
    expect(telemetry.breadcrumbs.length).toBeGreaterThan(0);
  });

  it("loghează erorile sanitizate fără să arunce excepții", () => {
    const testError = new Error("Test simulation error with key=AIzaSySecretKey123");
    const payload = telemetry.logError(testError, { userId: "user_test", token: "secret_token" });

    expect(payload).toBeDefined();
    expect(payload.message).toContain("[REDACTED_KEY]");
    expect(payload.context.token).toBe("[REDACTED]");
  });
});
