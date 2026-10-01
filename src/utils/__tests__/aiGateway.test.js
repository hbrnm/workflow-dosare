import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
vi.mock("../../supabaseClient", () => ({ supabase: { functions: { invoke: (...a) => invoke(...a) } } }));

import { callGemini, geminiText, resetAiGatewayState } from "../aiGateway";

const gemini = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const httpError = (status, payload) => ({
  name: "FunctionsHttpError",
  message: "Edge Function returned a non-2xx status code",
  context: { status, json: async () => payload },
});

beforeEach(() => {
  resetAiGatewayState();
  invoke.mockReset();
  vi.restoreAllMocks();
  globalThis.localStorage = { getItem: () => "" };
});

describe("aiGateway.callGemini", () => {
  it("folosește proxy-ul și nu apelează Gemini direct", async () => {
    invoke.mockResolvedValue({ data: { data: gemini("salut") }, error: null });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await callGemini({ contents: [] });
    expect(geminiText(res)).toBe("salut");
    expect(invoke).toHaveBeenCalledWith("ai-proxy", expect.objectContaining({ body: expect.any(Object) }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("propagă erorile reale (429) fără fallback pe cheia clientului", async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(429, { error: "Prea multe cereri", code: "rate_limited" }) });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(callGemini({ contents: [] }, { apiKey: "AIzaX" })).rejects.toThrow("Prea multe cereri");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("proxy nedeployat (404) + cheie proprie → apel direct cu cheia în header, nu în URL", async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(404, null) });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({ ok: true, json: async () => gemini("direct") });
    const res = await callGemini({ contents: [] }, { apiKey: "AIzaSecret" });
    expect(geminiText(res)).toBe("direct");
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).not.toContain("AIzaSecret");
    expect(init.headers["x-goog-api-key"]).toBe("AIzaSecret");
  });

  it("proxy indisponibil și fără cheie → eroare clară", async () => {
    invoke.mockResolvedValue({ data: null, error: { name: "FunctionsFetchError", message: "network" } });
    await expect(callGemini({ contents: [] })).rejects.toThrow(/nu este disponibil/i);
  });

  it("după prima indisponibilitate nu mai încearcă proxy-ul în sesiune", async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(404, null) });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => gemini("x") });
    await callGemini({ contents: [] }, { apiKey: "k" });
    await callGemini({ contents: [] }, { apiKey: "k" });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("not_configured pe server → tratat ca indisponibil", async () => {
    invoke.mockResolvedValue({ data: null, error: httpError(500, { error: "neconfigurat", code: "not_configured" }) });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => gemini("ok") });
    const res = await callGemini({ contents: [] }, { apiKey: "k" });
    expect(geminiText(res)).toBe("ok");
  });
});
