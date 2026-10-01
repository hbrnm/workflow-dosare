import { supabase } from "../supabaseClient";

/**
 * Acces unic la Gemini. Calea implicită este edge function-ul `ai-proxy` (cheia rămâne pe server).
 * Doar dacă funcția nu e disponibilă (nedeployed / neconfigurată / fără rețea către Supabase) și
 * utilizatorul a introdus o cheie proprie în Setări, se apelează Gemini direct, cu cheia în header.
 */

export const GEMINI_MODELS = [
  { version: "v1beta", name: "gemini-3.6-flash" },
  { version: "v1beta", name: "gemini-3.6-pro" },
  { version: "v1beta", name: "gemini-2.0-flash" },
  { version: "v1beta", name: "gemini-1.5-flash" },
  { version: "v1", name: "gemini-1.5-flash" },
  { version: "v1beta", name: "gemini-1.5-pro" },
  { version: "v1", name: "gemini-1.5-pro" },
  { version: "v1beta", name: "gemini-2.5-flash" },
];

let proxyUnavailable = false;

/** Doar pentru teste. */
export function resetAiGatewayState() {
  proxyUnavailable = false;
}

export function getStoredGeminiKey() {
  try {
    return (localStorage.getItem("gemini_api_key") || "").trim();
  } catch {
    return "";
  }
}

async function readErrorBody(error) {
  try {
    return await error?.context?.json?.();
  } catch {
    return null;
  }
}

async function callViaProxy(body, models) {
  const { data, error } = await supabase.functions.invoke("ai-proxy", { body: { body, models } });

  if (error) {
    const status = error?.context?.status;
    const payload = await readErrorBody(error);
    const code = payload?.code;
    const unavailable =
      error?.name === "FunctionsFetchError" ||
      error?.name === "FunctionsRelayError" ||
      status === 404 ||
      code === "not_configured";
    const err = new Error(payload?.error || error.message || "Serviciul AI nu a răspuns.");
    err.unavailable = unavailable;
    err.status = status;
    throw err;
  }

  if (data?.error) throw new Error(data.error);
  if (!data?.data) throw new Error("Răspuns invalid de la serviciul AI.");
  return data.data;
}

async function callDirect(body, models, apiKey) {
  let lastErr = null;
  for (const m of models) {
    const url = `https://generativelanguage.googleapis.com/${m.version}/models/${m.name}:generateContent`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body),
      });
      if (resp.ok) return await resp.json();
      lastErr = new Error(`Model ${m.name} (${m.version}): HTTP ${resp.status}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Niciun model Gemini nu este disponibil.");
}

/**
 * @param {object} body corpul Gemini generateContent ({ contents, generationConfig, ... })
 * @param {{ apiKey?: string, models?: {version:string,name:string}[] }} [opts]
 * @returns {Promise<object>} răspunsul Gemini
 */
export async function callGemini(body, { apiKey = "", models = GEMINI_MODELS } = {}) {
  const fallbackKey = (apiKey || getStoredGeminiKey()).trim();

  if (!proxyUnavailable) {
    try {
      return await callViaProxy(body, models);
    } catch (err) {
      if (!err.unavailable) throw err;
      proxyUnavailable = true;
    }
  }

  if (fallbackKey) return callDirect(body, models, fallbackKey);
  throw new Error("Serviciul AI nu este disponibil. Contactează administratorul sau introdu o cheie în Setări.");
}

/** Extrage primul text din răspunsul Gemini. */
export function geminiText(data) {
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
