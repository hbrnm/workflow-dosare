import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setSession(data.session);
      }
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });

    return () => subscription?.subscription?.unsubscribe?.();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("workflow_dosare_users");
      localStorage.removeItem("workflow_dosare_admins");
      localStorage.removeItem("workflow_dosare_asiguratori");
    } catch (err) {
      console.warn("Failed clearing localStorage on logout:", err);
    }
    await supabase.auth.signOut();
    setSession(null);
  };

  return {
    session,
    authLoading,
    setSession,
    handleLogout,
  };
}
