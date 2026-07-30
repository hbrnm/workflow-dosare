import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "../../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Email sau parolă greșite." : error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#EFEAE1] flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-white rounded-lg border border-[#DAD4C6] shadow-xl p-6 w-full max-w-sm space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded bg-[#C98A2B] flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div className="font-bold text-[15px] text-[#23282E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Dosare Daună
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-[#6B6558] mb-0.5">Email</label>
          <input
            type="email"
            required
            className="in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-[11px] text-[#6B6558] mb-0.5">Parolă</label>
          <input
            type="password"
            required
            className="in"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="text-[12px] text-[#B23A2E]">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-[#C98A2B] text-white text-[13px] font-semibold hover:bg-[#B37A22] disabled:opacity-60"
        >
          {loading ? "Se conectează..." : "Conectare"}
        </button>
        <div className="text-[11px] text-[#8A8375] text-center">
          Cont nou? Cere administratorului să-ți creeze unul din Supabase.
        </div>
      </form>
    </div>
  );
}
