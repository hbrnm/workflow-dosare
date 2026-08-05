import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { INSURERS } from "../constants/config";
import {
  DEFAULT_BRANDING,
  normalizeBranding,
  loadCachedBranding,
  cacheBranding,
} from "../constants/branding";

const BRANDING_SELECT =
  "atelier_nume, atelier_short, logo_url, accent_color";

export function useSettings(session, showNotice) {
  const [capacitateZilnica, setCapacitateZilnica] = useState(3);
  const [pragRidicare, setPragRidicare] = useState(3);
  const [pragInactivitate, setPragInactivitate] = useState(7);
  const [adminEmails, setAdminEmails] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [customInsurers, setCustomInsurers] = useState(INSURERS);
  const [branding, setBranding] = useState(() => loadCachedBranding());

  const myEmail = session?.user?.email || "";

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

      const { data: adminData } = await supabase
        .from("setari")
        .select("admin_emails")
        .eq("id", 1)
        .maybeSingle();

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
      };

      if (data?.capacitate_zilnica) setCapacitateZilnica(data.capacitate_zilnica);
      if (data?.prag_ridicare_zile) setPragRidicare(data.prag_ridicare_zile);
      if (data?.prag_inactivitate_zile) setPragInactivitate(data.prag_inactivitate_zile);
      if (Array.isArray(data?.asiguratori) && data.asiguratori.length > 0) {
        setCustomInsurers(data.asiguratori);
        try {
          localStorage.setItem("workflow_dosare_asiguratori", JSON.stringify(data.asiguratori));
        } catch (err) {
          console.warn("Unable to persist insurers to localStorage", err);
        }
      }

      if (data?.atelier_nume || data?.atelier_short || data?.logo_url || data?.accent_color) {
        const nextBrand = normalizeBranding(data);
        setBranding(nextBrand);
        cacheBranding(nextBrand);
      }

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
  }, [session, myEmail]);

  const sanitizeUsers = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map((u) => {
      if (!u || typeof u !== "object") return u;
      const { password, ...safeUser } = u;
      return safeUser;
    });
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

    const { error } = await supabase.from("setari").upsert({ id: 1, asiguratori: newList });
    if (error) {
      console.error("Setari asiguratori error:", error);
      showNotice("Eroare la salvarea asigurătorilor: " + error.message, "error");
    }
  };

  const saveCapacitate = async (n) => {
    setCapacitateZilnica(n);
    const { error } = await supabase.from("setari").upsert({ id: 1, capacitate_zilnica: n });
    if (error) showNotice(error.message, "error");
  };

  const savePragRidicare = async (n) => {
    setPragRidicare(n);
    const { error } = await supabase.from("setari").upsert({ id: 1, prag_ridicare_zile: n });
    if (error) showNotice(error.message, "error");
  };

  const savePragInactivitate = async (n) => {
    setPragInactivitate(n);
    const { error } = await supabase.from("setari").upsert({ id: 1, prag_inactivitate_zile: n });
    if (error) showNotice(error.message, "error");
  };

  const saveBranding = async (nextRaw) => {
    const next = normalizeBranding(nextRaw);
    setBranding(next);
    cacheBranding(next);

    const payload = {
      id: 1,
      atelier_nume: next.atelierNume,
      atelier_short: next.atelierShort,
      logo_url: next.logoUrl || null,
      accent_color: next.accentColor,
    };
    const { error } = await supabase.from("setari").upsert(payload);
    if (error) {
      showNotice(
        "Branding salvat local. Rulează migrarea 20 în Supabase pentru sync cloud: " + error.message,
        "warning"
      );
      return false;
    }
    return true;
  };

  const uploadBrandingLogo = async (file) => {
    if (!file) throw new Error("Niciun fișier selectat.");
    if (!file.type.startsWith("image/")) throw new Error("Încarcă o imagine (PNG, JPG, WebP, SVG).");
    if (file.size > 2 * 1024 * 1024) throw new Error("Logo-ul trebuie să aibă maxim 2 MB.");

    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `atelier/logo.${ext}`;
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

  return {
    capacitateZilnica,
    pragRidicare,
    pragInactivitate,
    adminEmails,
    usersList,
    customInsurers,
    branding,
    saveUsersAndAdmins,
    saveInsurers,
    saveCapacitate,
    savePragRidicare,
    savePragInactivitate,
    saveBranding,
    uploadBrandingLogo,
    handleAddUser,
    handleDeleteUser,
    handleToggleAdminRole,
  };
}

/** Public branding for Login (anon-readable view + local cache). */
export async function fetchPublicBranding() {
  const cached = loadCachedBranding();
  try {
    const { data, error } = await supabase
      .from("atelier_branding")
      .select(BRANDING_SELECT)
      .eq("id", 1)
      .maybeSingle();
    if (!error && data) {
      const next = normalizeBranding(data);
      cacheBranding(next);
      return next;
    }
  } catch {
    /* ignore */
  }
  return cached || { ...DEFAULT_BRANDING };
}
