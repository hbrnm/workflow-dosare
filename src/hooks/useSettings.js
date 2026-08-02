import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { INSURERS } from "../constants/config";

export function useSettings(session, showNotice) {
  const [capacitateZilnica, setCapacitateZilnica] = useState(3);
  const [pragRidicare, setPragRidicare] = useState(3);
  const [pragInactivitate, setPragInactivitate] = useState(7);
  const [adminEmails, setAdminEmails] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [customInsurers, setCustomInsurers] = useState(INSURERS);

  const myEmail = session?.user?.email || "";

  useEffect(() => {
    if (!session) return;

    (async () => {
      try {
        const localUsers = JSON.parse(localStorage.getItem("workflow_dosare_users") || "[]");
        const localAdmins = JSON.parse(localStorage.getItem("workflow_dosare_admins") || "[]");
        if (Array.isArray(localUsers) && localUsers.length > 0) setUsersList(localUsers);
        if (Array.isArray(localAdmins) && localAdmins.length > 0) setAdminEmails(localAdmins);
      } catch (err) {
        console.warn("Invalid local settings in localStorage", err);
      }

      const { data } = await supabase
        .from("setari")
        .select("capacitate_zilnica, prag_ridicare_zile, prag_inactivitate_zile, admin_emails, utilizatori, asiguratori")
        .eq("id", 1)
        .maybeSingle();

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

      const loadedAdmins = Array.isArray(data?.admin_emails) && data.admin_emails.length > 0
        ? data.admin_emails
        : JSON.parse(localStorage.getItem("workflow_dosare_admins") || "[]");

      const loadedUsers = Array.isArray(data?.utilizatori) && data.utilizatori.length > 0
        ? data.utilizatori
        : JSON.parse(localStorage.getItem("workflow_dosare_users") || "[]");

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

      setAdminEmails(loadedAdmins);
      setUsersList(loadedUsers);
      try {
        localStorage.setItem("workflow_dosare_users", JSON.stringify(loadedUsers));
        localStorage.setItem("workflow_dosare_admins", JSON.stringify(loadedAdmins));
      } catch (err) {
        console.warn("Unable to persist users/admins to localStorage", err);
      }
    })();
  }, [session, myEmail]);

  const saveUsersAndAdmins = async (newUsers, newAdmins) => {
    setUsersList(newUsers);
    setAdminEmails(newAdmins);

    try {
      localStorage.setItem("workflow_dosare_users", JSON.stringify(newUsers));
      localStorage.setItem("workflow_dosare_admins", JSON.stringify(newAdmins));
    } catch (err) {
      console.warn("Unable to persist users/admins to localStorage", err);
    }

    const { error } = await supabase.from("setari").upsert({ id: 1, utilizatori: newUsers, admin_emails: newAdmins });
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

  const handleAddUser = async ({ email, role, password }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (usersList.some((u) => u.email?.toLowerCase() === cleanEmail)) {
      throw new Error("Acest utilizator există deja în lista echipei.");
    }

    if (password && password.trim()) {
      try {
        const { error } = await supabase.auth.signUp({ email: cleanEmail, password: password.trim() });
        if (error && !error.message.toLowerCase().includes("already registered")) {
          console.warn("Supabase Auth notice:", error.message);
        }
      } catch (err) {
        console.warn("Supabase Auth error:", err);
      }
    }

    const newUserObj = { email: cleanEmail, role: role || "operator", password: (password || "").trim() };
    const updatedUsers = [...usersList.filter((u) => u.email?.toLowerCase() !== cleanEmail), newUserObj];
    const updatedAdmins = role === "admin"
      ? [...new Set([...adminEmails, cleanEmail])]
      : adminEmails.filter((e) => e.toLowerCase() !== cleanEmail);

    await saveUsersAndAdmins(updatedUsers, updatedAdmins);
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
    saveUsersAndAdmins,
    saveInsurers,
    saveCapacitate,
    savePragRidicare,
    savePragInactivitate,
    handleAddUser,
    handleDeleteUser,
    handleToggleAdminRole,
  };
}
