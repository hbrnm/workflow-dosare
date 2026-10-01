import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_BODY_BYTES = 12 * 1024 * 1024;
const RATE_LIMIT = 30; // cereri / fereastră / utilizator
const RATE_WINDOW_MS = 60_000;

const DEFAULT_MODELS = [
  { version: "v1beta", name: "gemini-3.6-flash" },
  { version: "v1beta", name: "gemini-3.6-pro" },
  { version: "v1beta", name: "gemini-2.0-flash" },
  { version: "v1beta", name: "gemini-1.5-flash" },
  { version: "v1", name: "gemini-1.5-flash" },
  { version: "v1beta", name: "gemini-1.5-pro" },
];

const MODEL_NAME_RE = /^gemini-[a-z0-9.\-]{1,40}$/;
const MAX_MODELS = 10;

const hits = new Map<string, number[]>();

function allowedOrigin(req: Request): string {
  const list = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return "*";
  const origin = req.headers.get("Origin") || "";
  return list.includes(origin) ? origin : list[0];
}

function cors(req: Request) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(req: Request, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(userId, recent);
    return true;
  }
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

function sanitizeModels(input: unknown): { version: string; name: string }[] {
  if (!Array.isArray(input) || input.length === 0) return DEFAULT_MODELS;
  const out: { version: string; name: string }[] = [];
  for (const m of input.slice(0, MAX_MODELS)) {
    const version = m?.version;
    const name = m?.name;
    if ((version === "v1" || version === "v1beta") && typeof name === "string" && MODEL_NAME_RE.test(name)) {
      out.push({ version, name });
    }
  }
  return out.length ? out : DEFAULT_MODELS;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Metodă nepermisă.", code: "method" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(req, { error: "Autorizare lipsă.", code: "unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!supabaseUrl || !anonKey || !apiKey) {
      return json(req, { error: "Serviciul AI nu este configurat pe server.", code: "not_configured" }, 500);
    }

    const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) {
      return json(req, { error: "Sesiune invalidă sau expirată.", code: "unauthorized" }, 401);
    }
    if (rateLimited(userData.user.id)) {
      return json(req, { error: "Prea multe cereri. Încearcă din nou într-un minut.", code: "rate_limited" }, 429);
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json(req, { error: "Cererea este prea mare.", code: "too_large" }, 413);
    }

    let parsed: { body?: { contents?: unknown }; models?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json(req, { error: "JSON invalid.", code: "bad_request" }, 400);
    }
    if (!parsed?.body || !Array.isArray(parsed.body.contents)) {
      return json(req, { error: "Câmpul body.contents lipsește.", code: "bad_request" }, 400);
    }

    let lastStatus = 502;
    let lastMessage = "Niciun model Gemini nu a răspuns.";
    for (const m of sanitizeModels(parsed.models)) {
      const url = `https://generativelanguage.googleapis.com/${m.version}/models/${m.name}:generateContent`;
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(parsed.body),
        });
        if (resp.ok) return json(req, { data: await resp.json() });
        lastStatus = resp.status;
        lastMessage = `Model ${m.name} (${m.version}): HTTP ${resp.status}`;
      } catch (err) {
        lastMessage = `Model ${m.name} (${m.version}): ${(err as Error)?.message || "eroare de rețea"}`;
      }
    }
    // Nu returnăm corpul erorii Gemini (poate conține detalii interne), doar statusul.
    return json(req, { error: lastMessage, code: "upstream", upstreamStatus: lastStatus }, 502);
  } catch (err) {
    return json(req, { error: (err as Error)?.message || "Eroare internă.", code: "internal" }, 500);
  }
});
