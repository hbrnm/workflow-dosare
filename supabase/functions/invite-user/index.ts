import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type TeamUser = { email: string; role: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Server misconfigured" }, 500);
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { data: isAdmin, error: adminErr } = await caller.rpc("is_admin");
    if (adminErr) {
      return json({ error: "Nu pot verifica drepturile de admin: " + adminErr.message }, 500);
    }
    if (!isAdmin) {
      return json({ error: "Doar administratorii pot invita utilizatori." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "").trim();
    const roleRaw = String(body?.role || "operator").toLowerCase().trim();
    const role =
      roleRaw === "admin"
        ? "admin"
        : roleRaw === "mecanic" || roleRaw === "tinichigiu" || roleRaw === "vopsitor"
        ? "mecanic"
        : roleRaw === "receptioner" || roleRaw === "receptionist" || roleRaw === "consilier"
        ? "receptioner"
        : "operator";

    if (!email || !email.includes("@")) {
      return json({ error: "Email invalid." }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Parola trebuie să aibă cel puțin 6 caractere." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role },
    });

    if (createErr) {
      const msg = createErr.message || "Nu am putut crea utilizatorul.";
      const already = /already|registered|exists/i.test(msg);
      if (!already) {
        return json({ error: msg }, 400);
      }
      // Cont Auth există deja — sincronizăm lista echipei.
    }

    const { data: settings, error: settingsErr } = await admin
      .from("setari")
      .select("utilizatori, admin_emails")
      .eq("id", 1)
      .maybeSingle();

    if (settingsErr) {
      return json({ error: settingsErr.message }, 500);
    }

    const existingUsers: TeamUser[] = Array.isArray(settings?.utilizatori)
      ? settings.utilizatori.filter(
          (u: TeamUser) => u?.email?.toLowerCase() !== email
        )
      : [];
    existingUsers.push({ email, role });

    let admins: string[] = Array.isArray(settings?.admin_emails)
      ? settings.admin_emails.map((e: string) => String(e).toLowerCase())
      : [];
    if (role === "admin") {
      if (!admins.includes(email)) admins.push(email);
    } else {
      admins = admins.filter((e) => e !== email);
    }

    const { error: upsertErr } = await admin.from("setari").upsert({
      id: 1,
      utilizatori: existingUsers,
      admin_emails: admins,
    });

    if (upsertErr) {
      return json({ error: upsertErr.message }, 500);
    }

    // Multi-tenant (migrare 29): sync membership when tables exist
    try {
      const { data: setariRow } = await admin
        .from("setari")
        .select("default_atelier_id, seat_limit, plan")
        .eq("id", 1)
        .maybeSingle();

      let atelierId = setariRow?.default_atelier_id as string | null;
      if (!atelierId) {
        const { data: atelier } = await admin
          .from("ateliere")
          .select("id, seat_limit, plan")
          .eq("slug", "default")
          .maybeSingle();
        atelierId = atelier?.id ?? null;
      }

      if (atelierId) {
        const seatLimit = Number(setariRow?.seat_limit) || 10;
        const { count } = await admin
          .from("atelier_membri")
          .select("user_id", { count: "exact", head: true })
          .eq("atelier_id", atelierId);

        const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const targetUser =
          created?.user ||
          listed?.users?.find((u) => (u.email || "").toLowerCase() === email) ||
          null;

        if (targetUser?.id) {
          const { data: existingMember } = await admin
            .from("atelier_membri")
            .select("user_id")
            .eq("atelier_id", atelierId)
            .eq("user_id", targetUser.id)
            .maybeSingle();

          if (!existingMember && typeof count === "number" && count >= seatLimit) {
            return json({
              error: `Limita de locuri (${seatLimit}) e atinsă pentru acest atelier.`,
            }, 400);
          }

          await admin.from("atelier_membri").upsert({
            atelier_id: atelierId,
            user_id: targetUser.id,
            email,
            role,
          });
        }
      }
    } catch {
      /* tables may not exist yet — setari sync is enough */
    }

    return json({
      ok: true,
      user: { email, role, id: created?.user?.id ?? null },
      utilizatori: existingUsers,
      admin_emails: admins,
      created_by: userData.user.email,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    return json({ error: message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
