import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "poze-dosare";
const SIGNED_URL_TTL_SECONDS = 3600;
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;
const MAX_PHOTOS = 60;
const TOKEN_RE = /^[A-Za-z0-9-]{8,64}$/;

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

function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = (req.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return xff[xff.length - 1] || "unknown";
}

function rateLimited(ip: string): boolean {
  if (ip === "unknown") return false;
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Metodă nepermisă." }, 405);

  try {
    if (rateLimited(clientIp(req))) {
      return json(req, { error: "Prea multe cereri. Încearcă din nou peste un minut." }, 429);
    }

    const { token } = await req.json().catch(() => ({ token: null }));
    if (typeof token !== "string" || !TOKEN_RE.test(token.trim())) {
      return json(req, { photos: [] });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json(req, { error: "Serviciul nu este configurat." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: rows, error: rpcErr } = await admin.rpc("tracking_photo_paths", { p_token: token.trim() });
    if (rpcErr) return json(req, { error: "Nu am putut încărca fotografiile." }, 500);

    const items = (Array.isArray(rows) ? rows : []).slice(0, MAX_PHOTOS) as Record<string, unknown>[];
    if (items.length === 0) return json(req, { photos: [] });

    const paths = items.map((i) => String(i.path));
    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signErr || !Array.isArray(signed)) {
      return json(req, { error: "Nu am putut genera linkurile fotografiilor." }, 500);
    }

    const urlByPath = new Map<string, string>();
    for (const s of signed) {
      if (s?.path && s.signedUrl && !s.error) urlByPath.set(s.path, s.signedUrl);
    }

    const photos = items
      .filter((i) => urlByPath.has(String(i.path)))
      .map((i) => ({ ...i, url: urlByPath.get(String(i.path)) }));

    return json(req, { photos });
  } catch (err) {
    return json(req, { error: (err as Error)?.message || "Eroare internă." }, 500);
  }
});
