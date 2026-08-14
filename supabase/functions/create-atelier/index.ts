import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Public self-serve: creează Auth user + atelier + membership admin.
 * Deploy cu verify_jwt = false (vezi config.toml).
 *
 * Body: { email, password, atelierNume, atelierShort?, slug? }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "").trim();
    const atelierNume = String(body?.atelierNume || "").trim();
    let atelierShort = String(body?.atelierShort || "").trim().toUpperCase().slice(0, 4);
    let slug = String(body?.slug || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return json({ error: "Email invalid." }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Parola trebuie să aibă cel puțin 6 caractere." }, 400);
    }
    if (atelierNume.length < 2) {
      return json({ error: "Introdu numele atelierului (min. 2 caractere)." }, 400);
    }
    if (!atelierShort) {
      atelierShort = atelierNume.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "AT";
    }
    if (!slug) {
      slug = slugify(atelierNume);
    }
    if (!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(slug) && !/^[a-z0-9]{2,48}$/.test(slug)) {
      return json({ error: "Slug invalid. Folosește litere, cifre și cratimă." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Tables must exist (migrare 29)
    const { error: tableProbe } = await admin.from("ateliere").select("id").limit(1);
    if (tableProbe) {
      return json({
        error: "Multi-tenant nu e activ. Rulează migrarea 29 în Supabase, apoi reîncearcă.",
      }, 503);
    }

    const { data: slugTaken } = await admin
      .from("ateliere")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (slugTaken) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });

    if (createErr) {
      const msg = createErr.message || "Nu am putut crea contul.";
      if (/already|registered|exists/i.test(msg)) {
        return json({
          error: "Există deja un cont cu acest email. Conectează-te sau resetează parola.",
        }, 400);
      }
      return json({ error: msg }, 400);
    }

    const userId = created?.user?.id;
    if (!userId) {
      return json({ error: "Cont creat fără id — contactează suportul." }, 500);
    }

    const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: atelier, error: atelierErr } = await admin
      .from("ateliere")
      .insert({
        slug,
        nume: atelierNume,
        short: atelierShort,
        plan: "trial",
        trial_ends_at: trialEnds,
        seat_limit: 10,
      })
      .select("id, slug, nume, short, plan, trial_ends_at, seat_limit")
      .single();

    if (atelierErr || !atelier) {
      // rollback user ca să nu rămână cont fără atelier
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        /* ignore */
      }
      return json({
        error: atelierErr?.message || "Nu am putut crea atelierul.",
      }, 500);
    }

    const { error: memberErr } = await admin.from("atelier_membri").insert({
      atelier_id: atelier.id,
      user_id: userId,
      email,
      role: "admin",
    });

    if (memberErr) {
      try {
        await admin.from("ateliere").delete().eq("id", atelier.id);
        await admin.auth.admin.deleteUser(userId);
      } catch {
        /* ignore */
      }
      return json({ error: memberErr.message }, 500);
    }

    // Session for client (optional) — sign in with password via anon
    const anon = createClient(supabaseUrl, anonKey);
    const { data: signed, error: signErr } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    return json({
      ok: true,
      atelier: {
        id: atelier.id,
        slug: atelier.slug,
        nume: atelier.nume,
        short: atelier.short,
      },
      user: { id: userId, email, role: "admin" },
      session: signErr ? null : signed?.session ?? null,
      message: "Atelier creat. Ești administrator pe trial 30 zile.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return json({ error: message }, 500);
  }
});

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "atelier";
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
