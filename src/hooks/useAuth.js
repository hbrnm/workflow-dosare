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
      if (s) {
        setSession(s);
      }
    });

    return () => subscription?.subscription?.unsubscribe?.();
  }, []);

  const handleLogout = async () => {
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
