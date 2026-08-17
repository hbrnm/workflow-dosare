import { describe, it, expect, beforeEach } from "vitest";
import {
  markLiveCameraDenied,
  isLiveCameraDenied,
  clearLiveCameraDenied,
  isCameraPermissionDeniedError,
} from "../cameraFallback";

function installMemorySession() {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(String(key), String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

describe("cameraFallback", () => {
  beforeEach(() => {
    installMemorySession();
  });

  it("remembers a denied live-camera permission for this session", () => {
    expect(isLiveCameraDenied()).toBe(false);
    markLiveCameraDenied();
    expect(isLiveCameraDenied()).toBe(true);
    clearLiveCameraDenied();
    expect(isLiveCameraDenied()).toBe(false);
  });

  it("detects permission-denied getUserMedia errors", () => {
    expect(isCameraPermissionDeniedError({ name: "NotAllowedError" })).toBe(true);
    expect(isCameraPermissionDeniedError({ name: "PermissionDeniedError" })).toBe(true);
    expect(isCameraPermissionDeniedError({ name: "NotFoundError" })).toBe(false);
    expect(isCameraPermissionDeniedError(null)).toBe(false);
  });
});
