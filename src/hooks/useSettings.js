import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { INSURERS, cacheStatusAlertOverrides } from "../constants/config";
import {
  DEFAULT_BRANDING,
  normalizeBranding,
  loadCachedBranding,
  cacheBranding,
  isPlaceholderAtelierName,
} from "../constants/branding";
import {
  shouldMirrorSetari,
  atelierRowToSettings,
  brandingToAtelierPatch,
  atelierPatchToSetariMirror,
  brandingLogoStoragePath,
} from "../utils/atelierSettings";
import {
  normalizeManoperaTarife,
  loadCachedManoperaTarife,
  cacheManoperaTarife,
} from "../constants/manoperaTarife";

const BRANDING_SELECT =
  "atelier_nume, atelier_short, logo_url";

const ATELIER_SETTINGS_SELECT =
  "id, slug, nume, short, logo_url, capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, asiguratori, termene_alerta_status, manopera_tarife, plan, trial_ends_at, seat_limit";

export function useSettings(session, showNotice, { atelierId = null, atelierSlug = null } = {}) {
  const [capacitateZilnica, setCapacitateZilnica] = useState(3);
  const [pragRidicare, setPragRidicare] = useState(3);
  const [pragInactivitate, setPragInactivitate] = useState(7);
  const [adminEmails, setAdminEmails] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [customInsurers, setCustomInsurers] = useState(INSURERS);
  const [branding, setBranding] = useState(() => loadCachedBranding());
  const [termeneAlertaStatus, setTermeneAlertaStatus] = useState({});
  const [billingSettings, setBillingSettings] = useState({
    plan: "trial",
    trialEndsAt: null,
    seatLimit: 10,
  });
  const [manoperaTarife, setManoperaTarife] = useState(() => loadCachedManoperaTarife());
  const [resolvedSlug, setResolvedSlug] = useState(atelierSlug);

  const myEmail = session?.user?.email || "";
  const slugRef = useRef(atelierSlug);
  slugRef.current = resolvedSlug || atelierSlug;

  useEffect(() => {
    setResolvedSlug(atelierSlug);
  }, [atelierSlug, atelierId]);

  useEffect(() => {
    if (!session) return;

    (async () => {
      try {
        const rawLocalUsers = JSON.parse(localStorage.getItem("workflow_dosare_users") || "[]");
        const localUsers = sanitizeUsers(rawLocalUsers);
        const localAdmins = JSON.parse(localStorage.getItem("workflow_dosare_admins") || "[]");
        if (Array.isArray(localUsers) && localUsers.length > 0) setUsersList(localUsers);
        if (Array.isArray(localAdmins) && localAdmins.length > 0) setAdminEmails(localAdmins);
      } catch (err) {
        console.warn("Invalid local settings in localStorage", err);
      }

      // ── Per-tenant: load from ateliere ────────────────────
      if (atelierId) {
        let atelierRow = null;
        let atelierErr = null;
        {
          const res = await supabase
            .from("ateliere")
            .select(ATELIER_SETTINGS_SELECT)
            .eq("id", atelierId)
            .maybeSingle();
          atelierRow = res.data;
          atelierErr = res.error;
          if (atelierErr && /manopera_tarife|column/i.test(String(atelierErr.message || ""))) {
            const res2 = await supabase
              .from("ateliere")
              .select("id, slug, nume, short, logo_url, capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, asiguratori, termene_alerta_status, plan, trial_ends_at, seat_limit")
              .eq("id", atelierId)
              .maybeSingle();
            atelierRow = res2.data;
            atelierErr = res2.error;
          }
        }

        if (!atelierErr && atelierRow) {
          setResolvedSlug(atelierRow.slug || atelierSlug);
          applySettingsData(atelierRowToSettings(atelierRow));
        }

        let cleanLoadedUsers = [];
        let nextAdmins = [];
        try {
          const { data: members, error: memErr } = await supabase
            .from("atelier_membri")
            .select("email, role")
            .eq("atelier_id", atelierId);
          if (!memErr && Array.isArray(members)) {
            cleanLoadedUsers = sanitizeUsers(
              members.map((m) => ({
                email: String(m.email || "").toLowerCase(),
                role: m.role || "operator",
              }))
            );
            nextAdmins = cleanLoadedUsers
              .filter((u) => u.role === "admin")
              .map((u) => u.email);
          }
        } catch {
          /* ignore */
        }

        if (myEmail && !cleanLoadedUsers.some((u) => u.email?.toLowerCase() === myEmail.toLowerCase())) {
          cleanLoadedUsers.push({ email: myEmail, role: cleanLoadedUsers.length === 0 ? "admin" : "operator" });
          if (cleanLoadedUsers.length === 1) nextAdmins = [myEmail];
        }

        // Solo atelier: un singur membru = admin în UI (și încercare heal DB)
        if (cleanLoadedUsers.length === 1 && myEmail) {
          const only = cleanLoadedUsers[0];
          const em = String(only.email || "").toLowerCase();
          if (em === myEmail.toLowerCase() && only.role !== "admin") {
            only.role = "admin";
            nextAdmins = [em];
            await supabase.rpc("ensure_atelier_admin", { p_atelier_id: atelierId });
          } else if (em === myEmail.toLowerCase()) {
            nextAdmins = [em];
          }
        }

        setAdminEmails(nextAdmins);
        setUsersList(cleanLoadedUsers);
        try {
          localStorage.setItem("workflow_dosare_users", JSON.stringify(cleanLoadedUsers));
          localStorage.setItem("workflow_dosare_admins", JSON.stringify(nextAdmins));
        } catch (err) {
          console.warn("Unable to persist users/admins to localStorage", err);
        }
        return;
      }

      // ── Legacy: setari id=1 ───────────────────────────────
      let publicData = null;
      let publicErr = null;
      {
        const res = await supabase
          .from("setari_publice")
          .select(`capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, utilizatori, asiguratori, ${BRANDING_SELECT}`)
          .eq("id", 1)
          .maybeSingle();
        publicData = res.data;
        publicErr = res.error;
        if (publicErr) {
          const res2 = await supabase
            .from("setari_publice")
            .select("capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, utilizatori, asiguratori")
            .eq("id", 1)
            .maybeSingle();
          if (!res2.error) {
            publicData = res2.data;
            publicErr = null;
          }
        }
      }

      let adminData = null;
      {
        const adminRes = await supabase
          .from("setari")
          .select("admin_emails, termene_alerta_status, plan, trial_ends_at, seat_limit, default_atelier_id")
          .eq("id", 1)
          .maybeSingle();
        if (adminRes.error) {
          const adminRes2 = await supabase
            .from("setari")
            .select("admin_emails, termene_alerta_status")
            .eq("id", 1)
            .maybeSingle();
          adminData = adminRes2.data;
        } else {
          adminData = adminRes.data;
        }
      }

      let settingsFromTable = null;
      if (publicErr || !publicData) {
        const res = await supabase
          .from("setari")
          .select(`capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, utilizatori, asiguratori, ${BRANDING_SELECT}`)
          .eq("id", 1)
          .maybeSingle();
        if (res.error) {
          const res2 = await supabase
            .from("setari")
            .select("capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, utilizatori, asiguratori")
            .eq("id", 1)
            .maybeSingle();
          settingsFromTable = res2.data;
        } else {
          settingsFromTable = res.data;
        }
      }

      const data = {
        ...(publicData || settingsFromTable || {}),
        admin_emails: adminData?.admin_emails,
        termene_alerta_status: adminData?.termene_alerta_status,
        plan: adminData?.plan,
        trial_ends_at: adminData?.trial_ends_at,
        seat_limit: adminData?.seat_limit,
      };

      applySettingsData(data);

      const loadedAdmins = Array.isArray(data?.admin_emails) && data.admin_emails.length > 0
        ? data.admin_emails
        : JSON.parse(localStorage.getItem("workflow_dosare_admins") || "[]");

      const rawLoadedUsers = Array.isArray(data?.utilizatori) && data.utilizatori.length > 0
        ? data.utilizatori
        : JSON.parse(localStorage.getItem("workflow_dosare_users") || "[]");
      const loadedUsers = sanitizeUsers(rawLoadedUsers);

      if (myEmail) {
        if (!loadedUsers.some((u) => u.email?.toLowerCase() === myEmail.toLowerCase())) {
          const isFirst = loadedUsers.length === 0 || loadedAdmins.length === 0;
          loadedUsers.push({ email: myEmail, role: isFirst ? "admin" : "operator" });
        }
        if (loadedAdmins.length === 0 || loadedUsers.some((u) => u.email?.toLowerCase() === myEmail.toLowerCase() && u.role === "admin")) {
          if (!loadedAdmins.some((e) => e.toLowerCase() === myEmail.toLowerCase())) {
            loadedAdmins.push(myEmail);
          }
        }
      }

      const cleanLoadedUsers = sanitizeUsers(loadedUsers);
      setAdminEmails(loadedAdmins);
      setUsersList(cleanLoadedUsers);
      try {
        localStorage.setItem("workflow_dosare_users", JSON.stringify(cleanLoadedUsers));
        localStorage.setItem("workflow_dosare_admins", JSON.stringify(loadedAdmins));
      } catch (err) {
        console.warn("Unable to persist users/admins to localStorage", err);
      }
    })();
  }, [session, myEmail, atelierId, atelierSlug]);

  function applySettingsData(data) {
    if (!data) return;
    if (data.capacitate_zilnica) setCapacitateZilnica(data.capacitate_zilnica);
    if (data.prag_ridicare_zile) setPragRidicare(data.prag_ridicare_zile);
    if (data.prag_inactivitate_zile) setPragInactivitate(data.prag_inactivitate_zile);
    if (data.termene_alerta_status && typeof data.termene_alerta_status === "object") {
      setTermeneAlertaStatus(data.termene_alerta_status);
      cacheStatusAlertOverrides(data.termene_alerta_status);
    }
    if (Array.isArray(data.asiguratori) && data.asiguratori.length > 0) {
      setCustomInsurers(data.asiguratori);
      try {
        localStorage.setItem("workflow_dosare_asiguratori", JSON.stringify(data.asiguratori));
      } catch (err) {
        console.warn("Unable to persist insurers to localStorage", err);
      }
    }
    if (data.atelier_nume || data.atelier_short || data.logo_url) {
      const nextBrand = normalizeBranding(data);
      setBranding(nextBrand);
      cacheBranding(nextBrand);
    }
    if (data.plan || data.trial_ends_at || data.seat_limit) {
      setBillingSettings({
        plan: data.plan || "trial",
        trialEndsAt: data.trial_ends_at || null,
        seatLimit: data.seat_limit ?? 10,
      });
    }
    if (data.manopera_tarife && typeof data.manopera_tarife === "object") {
      const next = normalizeManoperaTarife(data.manopera_tarife);
      setManoperaTarife(next);
      cacheManoperaTarife(next);
    }
  }

  const sanitizeUsers = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map((u) => {
      if (!u || typeof u !== "object") return u;
      const { password, ...safeUser } = u;
      return safeUser;
    });
  };

  const persistAtelierPatch = async (patch) => {
    if (!atelierId) return { ok: false, error: new Error("Fără atelier activ") };

    // Best-effort: vindecă rol admin înainte de save (migrare 37; ignoră dacă lipsește)
    await supabase.rpc("ensure_atelier_admin", { p_atelier_id: atelierId });

    // 1) RPC update_atelier_settings (migrare 35/36/37)
    const { data: rpcRow, error: rpcErr } = await supabase.rpc("update_atelier_settings", {
      p_atelier_id: atelierId,
      p_patch: patch,
    });

    if (!rpcErr && rpcRow) {
      if (rpcRow.slug) slugRef.current = rpcRow.slug;
      return { ok: true, row: rpcRow };
    }

    // 2) Edge function cu service role + self-heal (nu depinde de SQL manual)
    try {
      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "update-atelier-settings",
        { body: { atelierId, patch } }
      );
      if (!fnErr && fnData?.ok && fnData?.atelier) {
        if (fnData.atelier.slug) slugRef.current = fnData.atelier.slug;
        return { ok: true, row: fnData.atelier };
      }
      let fnMessage = fnData?.error || null;
      if (!fnMessage && fnErr?.context && typeof fnErr.context.json === "function") {
        try {
          const body = await fnErr.context.json();
          fnMessage = body?.error || null;
        } catch {
          /* ignore */
        }
      }
      if (!fnMessage) fnMessage = fnErr?.message || null;
      // Function missing / network → fall through to direct update
      const softFail = !fnMessage || /failed to (send|fetch)|FunctionsRelayError|not found|404/i.test(String(fnMessage));
      if (!softFail) {
        return { ok: false, error: new Error(fnMessage) };
      }
    } catch (err) {
      console.warn("update-atelier-settings edge fallback:", err?.message || err);
    }

    // 3) Fallback: update direct + detectează RLS care „înghite” update-ul (0 rows)
    const { data, error } = await supabase
      .from("ateliere")
      .update(patch)
      .eq("id", atelierId)
      .select("id, slug, nume, short, logo_url")
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: new Error(
          rpcErr?.message ||
            error.message ||
            "Nu am putut salva setările atelierului."
        ),
      };
    }
    if (!data) {
      return {
        ok: false,
        error: new Error(
          rpcErr?.message ||
            "Nu am putut salva denumirea atelierului. Deploy edge function update-atelier-settings sau rulează migrarea 37 în Supabase SQL Editor."
        ),
      };
    }

    if (shouldMirrorSetari(data.slug || slugRef.current)) {
      const mirror = atelierPatchToSetariMirror(patch);
      if (Object.keys(mirror).length > 0) {
        const { error: mirrorErr } = await supabase.from("setari").upsert({ id: 1, ...mirror });
        if (mirrorErr) {
          console.warn("Mirror setari (default) failed:", mirrorErr.message);
        }
      }
    }
    return { ok: true, row: data };
  };

  const saveUsersAndAdmins = async (newUsers, newAdmins) => {
    const cleanUsers = sanitizeUsers(newUsers);
    setUsersList(cleanUsers);
    setAdminEmails(newAdmins);

    try {
      localStorage.setItem("workflow_dosare_users", JSON.stringify(cleanUsers));
      localStorage.setItem("workflow_dosare_admins", JSON.stringify(newAdmins));
    } catch (err) {
      console.warn("Unable to persist users/admins to localStorage", err);
    }

    if (atelierId) {
      const { data: current, error: curErr } = await supabase
        .from("atelier_membri")
        .select("user_id, email, role")
        .eq("atelier_id", atelierId);
      if (curErr) {
        showNotice("Eroare citire echipă: " + curErr.message, "error");
        return;
      }

      const keep = new Set(cleanUsers.map((u) => String(u.email || "").toLowerCase()));
      for (const m of current || []) {
        const em = String(m.email || "").toLowerCase();
        if (!keep.has(em)) {
          const { error: delErr } = await supabase
            .from("atelier_membri")
            .delete()
            .eq("atelier_id", atelierId)
            .eq("user_id", m.user_id);
          if (delErr) {
            showNotice("Eroare la eliminarea membrului: " + delErr.message, "error");
            return;
          }
        }
      }

      for (const u of cleanUsers) {
        const em = String(u.email || "").toLowerCase();
        const role = newAdmins.some((e) => String(e).toLowerCase() === em)
          ? "admin"
          : u.role || "operator";
        const { error: upErr } = await supabase
          .from("atelier_membri")
          .update({ role, email: em })
          .eq("atelier_id", atelierId)
          .eq("email", em);
        if (upErr) {
          // try case-insensitive match via filter on existing rows
          const match = (current || []).find((m) => String(m.email || "").toLowerCase() === em);
          if (match) {
            const { error: up2 } = await supabase
              .from("atelier_membri")
              .update({ role, email: em })
              .eq("atelier_id", atelierId)
              .eq("user_id", match.user_id);
            if (up2) {
              showNotice("Eroare actualizare rol: " + up2.message, "error");
              return;
            }
          }
        }
      }

      if (shouldMirrorSetari(slugRef.current)) {
        const { error } = await supabase.from("setari").upsert({
          id: 1,
          utilizatori: cleanUsers,
          admin_emails: newAdmins,
        });
        if (error) console.warn("Mirror team → setari failed:", error.message);
      }
      return;
    }

    const { error } = await supabase.from("setari").upsert({ id: 1, utilizatori: cleanUsers, admin_emails: newAdmins });
    if (error) {
      console.error("Setari upsert error:", error);
      showNotice("Salvat local. Eroare salvare Supabase setări: " + error.message, "warning");
    }
  };

  const saveInsurers = async (newList) => {
    setCustomInsurers(newList);
    try {
      localStorage.setItem("workflow_dosare_asiguratori", JSON.stringify(newList));
    } catch (err) {
      console.warn("Unable to persist insurers to localStorage", err);
    }

    if (atelierId) {
      const { ok, error } = await persistAtelierPatch({ asiguratori: newList });
      if (!ok) showNotice("Eroare la salvarea asigurătorilor: " + error.message, "error");
      return;
    }

    const { error } = await supabase.from("setari").upsert({ id: 1, asiguratori: newList });
    if (error) {
      console.error("Setari asiguratori error:", error);
      showNotice("Eroare la salvarea asigurătorilor: " + error.message, "error");
    }
  };

  const saveCapacitate = async (n) => {
    setCapacitateZilnica(n);
    if (atelierId) {
      const { ok, error } = await persistAtelierPatch({ capacitate_zilnica: n });
      if (!ok) showNotice(error.message, "error");
      return;
    }
    const { error } = await supabase.from("setari").upsert({ id: 1, capacitate_zilnica: n });
    if (error) showNotice(error.message, "error");
  };

  const savePragRidicare = async (n) => {
    setPragRidicare(n);
    if (atelierId) {
      const { ok, error } = await persistAtelierPatch({ prag_ridicare_zile: n });
      if (!ok) showNotice(error.message, "error");
      return;
    }
    const { error } = await supabase.from("setari").upsert({ id: 1, prag_ridicare_zile: n });
    if (error) showNotice(error.message, "error");
  };

  const savePragInactivitate = async (n) => {
    setPragInactivitate(n);
    if (atelierId) {
      const { ok, error } = await persistAtelierPatch({ prag_inactivitate_zile: n });
      if (!ok) showNotice(error.message, "error");
      return;
    }
    const { error } = await supabase.from("setari").upsert({ id: 1, prag_inactivitate_zile: n });
    if (error) showNotice(error.message, "error");
  };

  const saveTermeneAlertaStatus = async (map) => {
    const next = map && typeof map === "object" ? map : {};
    setTermeneAlertaStatus(next);
    cacheStatusAlertOverrides(next);
    if (atelierId) {
      const { ok, error } = await persistAtelierPatch({ termene_alerta_status: next });
      if (!ok) {
        showNotice("Praguri alertă: " + error.message, "warning");
        return false;
      }
      return true;
    }
    const { error } = await supabase.from("setari").upsert({ id: 1, termene_alerta_status: next });
    if (error) {
      showNotice(
        "Praguri alertă salvate local. Rulează migrarea 21 în Supabase pentru sync cloud: " + error.message,
        "warning"
      );
      return false;
    }
    return true;
  };

  const saveBranding = async (nextRaw) => {
    const next = normalizeBranding(nextRaw);

    if (atelierId) {
      const patch = brandingToAtelierPatch(next);
      const { ok, error } = await persistAtelierPatch(patch);
      if (!ok) {
        showNotice("Branding: " + (error?.message || "salvare eșuată"), "error");
        return false;
      }
      setBranding(next);
      cacheBranding(next);
      return true;
    }

    const payload = {
      id: 1,
      atelier_nume: next.atelierNume,
      atelier_short: next.atelierShort,
      logo_url: next.logoUrl || null,
      accent_color: null,
    };
    const { error } = await supabase.from("setari").upsert(payload);
    if (error) {
      showNotice(
        "Branding: nu s-a putut salva în cloud: " + error.message,
        "error"
      );
      return false;
    }
    setBranding(next);
    cacheBranding(next);
    return true;
  };

  const uploadBrandingLogo = async (file) => {
    if (!file) throw new Error("Niciun fișier selectat.");
    if (!file.type.startsWith("image/")) throw new Error("Încarcă o imagine (PNG, JPG, WebP, SVG).");
    if (file.size > 2 * 1024 * 1024) throw new Error("Logo-ul trebuie să aibă maxim 2 MB.");

    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = brandingLogoStoragePath(atelierId, ext);
    const { error } = await supabase.storage.from("branding").upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });
    if (error) {
      throw new Error(
        error.message.includes("Bucket not found")
          ? "Bucket-ul „branding” lipsește — rulează migrarea 20 sau lipește un URL public."
          : error.message
      );
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  };

  const handleAddUser = async ({ email, role, password }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (usersList.some((u) => u.email?.toLowerCase() === cleanEmail)) {
      throw new Error("Acest utilizator există deja în lista echipei.");
    }

    const cleanPassword = password?.trim() || "";
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error("Parola trebuie să aibă cel puțin 6 caractere.");
    }

    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: {
        email: cleanEmail,
        password: cleanPassword,
        role: role || "operator",
        atelierId: atelierId || undefined,
      },
    });

    if (error || data?.error) {
      let detail = data?.error || null;
      try {
        if (!detail && error?.context && typeof error.context.json === "function") {
          const body = await error.context.json();
          detail = body?.error || null;
        }
      } catch (_) {
        /* ignore parse errors */
      }
      throw new Error(detail || error?.message || "Eroare la invitarea utilizatorului.");
    }

    const updatedUsers = Array.isArray(data?.utilizatori)
      ? sanitizeUsers(data.utilizatori)
      : [...usersList.filter((u) => u.email?.toLowerCase() !== cleanEmail), { email: cleanEmail, role: role || "operator" }];
    const updatedAdmins = Array.isArray(data?.admin_emails)
      ? data.admin_emails
      : role === "admin"
      ? [...new Set([...adminEmails, cleanEmail])]
      : adminEmails.filter((e) => e.toLowerCase() !== cleanEmail);

    setUsersList(updatedUsers);
    setAdminEmails(updatedAdmins);
    try {
      localStorage.setItem("workflow_dosare_users", JSON.stringify(updatedUsers));
      localStorage.setItem("workflow_dosare_admins", JSON.stringify(updatedAdmins));
    } catch (err) {
      console.warn("Unable to persist users/admins to localStorage", err);
    }
  };

  const handleDeleteUser = async (emailToDelete) => {
    const cleanEmail = emailToDelete.trim().toLowerCase();
    if (cleanEmail === myEmail.toLowerCase()) {
      showNotice("Nu te poți șterge pe tine însuți din sistem.", "error");
      return;
    }
    const updatedUsers = usersList.filter((u) => u.email?.toLowerCase() !== cleanEmail);
    const updatedAdmins = adminEmails.filter((e) => e.toLowerCase() !== cleanEmail);
    await saveUsersAndAdmins(updatedUsers, updatedAdmins);
    showNotice(`Utilizatorul „${cleanEmail}” a fost eliminat.`, "info");
  };

  const handleToggleAdminRole = async (targetEmail) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    const currentObj = usersList.find((u) => u.email?.toLowerCase() === cleanEmail);
    const willBeAdmin = currentObj?.role !== "admin";

    const updatedUsers = usersList.map((u) =>
      u.email?.toLowerCase() === cleanEmail ? { ...u, role: willBeAdmin ? "admin" : "operator" } : u
    );
    const updatedAdmins = willBeAdmin
      ? [...new Set([...adminEmails, cleanEmail])]
      : adminEmails.filter((e) => e.toLowerCase() !== cleanEmail);

    await saveUsersAndAdmins(updatedUsers, updatedAdmins);
    showNotice(
      willBeAdmin ? `Utilizatorul „${cleanEmail}” este acum Administrator.` : `Utilizatorul „${cleanEmail}” este acum Operator.`,
      "success"
    );
  };

  const saveManoperaTarife = async (nextRaw) => {
    const next = normalizeManoperaTarife(nextRaw);
    setManoperaTarife(next);
    cacheManoperaTarife(next);

    if (atelierId) {
      const { ok, error } = await persistAtelierPatch({ manopera_tarife: next });
      if (!ok) {
        showNotice(
          "Tarife manoperă salvate local. Pentru sync cloud rulează migrarea 38: " + error.message,
          "warning"
        );
        return false;
      }
      return true;
    }

    return true;
  };

  const saveBilling = async (next) => {
    const plan = next.plan || "trial";
    const trial_ends_at = next.trialEndsAt || null;
    const seat_limit = Number(next.seatLimit) || 10;
    setBillingSettings({
      plan,
      trialEndsAt: trial_ends_at,
      seatLimit: seat_limit,
    });

    if (atelierId) {
      const { ok, error } = await persistAtelierPatch({ plan, trial_ends_at, seat_limit });
      if (!ok) {
        showNotice("Nu am putut salva planul atelierului: " + error.message, "error");
        return false;
      }
      return true;
    }

    const { error } = await supabase.from("setari").upsert({
      id: 1,
      plan,
      trial_ends_at,
      seat_limit,
    });
    if (error) {
      showNotice(
        "Plan salvat local. Rulează migrarea 29 în Supabase pentru sync: " + error.message,
        "warning"
      );
      return false;
    }
    return true;
  };

  return {
    capacitateZilnica,
    pragRidicare,
    pragInactivitate,
    adminEmails,
    usersList,
    customInsurers,
    branding,
    billingSettings,
    manoperaTarife,
    saveUsersAndAdmins,
    saveInsurers,
    saveCapacitate,
    savePragRidicare,
    savePragInactivitate,
    saveTermeneAlertaStatus,
    termeneAlertaStatus,
    saveBranding,
    uploadBrandingLogo,
    saveBilling,
    saveManoperaTarife,
    handleAddUser,
    handleDeleteUser,
    handleToggleAdminRole,
  };
}

/** Public branding for Login — optional slug via RPC (migrare 31). */
export async function fetchPublicBranding(slug = null) {
  const cached = loadCachedBranding();
  const cleanSlug = String(slug || "").trim().toLowerCase();

  if (cleanSlug) {
    try {
      const { data, error } = await supabase.rpc("get_public_atelier_branding", {
        p_slug: cleanSlug,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (!error && row) {
        const next = normalizeBranding({
          atelier_nume: row.nume,
          atelier_short: row.short,
          logo_url: row.logo_url,
        });
        if (isPlaceholderAtelierName(next.atelierNume) && !next.logoUrl) {
          return { ...DEFAULT_BRANDING };
        }
        cacheBranding(next);
        return next;
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const { data, error } = await supabase
      .from("atelier_branding")
      .select(BRANDING_SELECT)
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) {
      const next = normalizeBranding(data);
      if (isPlaceholderAtelierName(next.atelierNume) && !next.logoUrl) {
        return cached && !isPlaceholderAtelierName(cached.atelierNume)
          ? cached
          : { ...DEFAULT_BRANDING };
      }
      cacheBranding(next);
      return next;
    }
  } catch {
    /* ignore */
  }
  return cached && !isPlaceholderAtelierName(cached.atelierNume)
    ? cached
    : { ...DEFAULT_BRANDING };
}
