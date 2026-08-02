import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const storedCustom = localStorage.getItem("workflow_dosare_custom_session");
    if (storedCustom) {
      try {
        const parsed = JSON.parse(storedCustom);
        if (parsed?.user?.email) {
          setSession(parsed);
          setAuthLoading(false);
        }
      } catch (err) {
        console.warn("Invalid custom session in localStorage", err);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session && !localStorage.getItem("workflow_dosare_custom_session")) {
        setSession(data.session);
      }
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s && !localStorage.getItem("workflow_dosare_custom_session")) {
        setSession(s);
      }
    });

    return () => subscription?.subscription?.unsubscribe?.();
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("workflow_dosare_custom_session");
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
