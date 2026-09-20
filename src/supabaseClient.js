import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    "Lipsesc VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Vezi .env.example și README.md."
  );
}

// Folosim valori fictive dacă lipsesc variabilele, pentru a preveni erorile de tip crash
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        // Limitare rate evenimente realtime — previne flood WebSocket pe Free tier
        eventsPerSecond: 2,
      },
    },
  }
);