// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClaimModal } from "../useClaimModal";
import { emptyClaim } from "../../utils/claimModel";

const setup = () => renderHook(() => useClaimModal(vi.fn()));

describe("useClaimModal.openNew", () => {
  it("fără argumente: fără valori implicite", () => {
    const { result } = setup();
    act(() => result.current.openNew());
    expect(result.current.quickCreateOpen).toBe(true);
    expect(result.current.quickCreateDefaults).toBeNull();
  });

  it("status și dată text sunt păstrate", () => {
    const { result } = setup();
    act(() => result.current.openNew("programat", "2026-10-05T09:00"));
    expect(result.current.quickCreateDefaults).toEqual({ status: "programat", dataProgramare: "2026-10-05T09:00" });
  });

  it("un dosar pasat ca status nu ajunge în stare (era cauza unui crash de randare)", () => {
    const { result } = setup();
    act(() => result.current.openNew({ ...emptyClaim("constatare"), observatii: "x" }));
    expect(result.current.quickCreateOpen).toBe(true);
    expect(result.current.quickCreateDefaults).toBeNull();
  });

  it("evenimentul de click (handler direct) e ignorat", () => {
    const { result } = setup();
    act(() => result.current.openNew({ type: "click", target: {}, nativeEvent: {} }));
    expect(result.current.quickCreateDefaults).toBeNull();
  });
});
