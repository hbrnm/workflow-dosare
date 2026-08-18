import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  /** True while user arrived via recovery email link and must set a new password. */
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setSession(data.session);
      }
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      }
      if (event === "SIGNED_OUT") {
        setPasswordRecovery(false);
      }
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
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase signOut error:", err);
    }
    setPasswordRecovery(false);
    setSession(null);
  };

  const clearPasswordRecovery = () => setPasswordRecovery(false);

  return {
    session,
    authLoading,
    setSession,
    handleLogout,
    authLogout: handleLogout,
    passwordRecovery,
    clearPasswordRecovery,
  };
}
