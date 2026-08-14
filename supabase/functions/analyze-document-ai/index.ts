import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT_ROMANIAN_CLAIMS = `Ești un asistent expert în procesarea și analiza documentelor de daună auto din România (devize Audatex, Eurotax, procese verbale de constatare daune, cereri de despăgubire, certificate de înmatriculare/taloane, facturi de piese).

Analizează documentul atașat (imagine sau PDF) și extrage toate datele disponibile în următorul format JSON strict. Dacă o informație nu este găsită în document, returnează null sau string gol.

Formatul JSON de returnat trebuie să aibă exact această structură:
{
  "numarDosar": string sau null,
  "nrDosarAsigurator": string sau null,
  "asigurator": string sau null,
  "tipAsigurare": string ("RCA" sau "CASCO"),
  "client": string sau null,
  "delegat": string sau null,
  "telefonClient": string sau null,
  "numarInmatriculare": string sau null,
  "vin": string sau null,
  "marca": string sau null,
  "model": string sau null,
  "kilometraj": number sau null,
  "inspectorDauna": string sau null,
  "ceEsteDeReparat": string sau null,
  "valoareDevizAudatex": number sau null,
  "valoarePieseAudatex": number sau null,
  "manoperaTinichigerie": number sau null,
  "manoperaVopsitorie": number sau null,
  "materialeVopsitorie": number sau null,
  "valoareFransiza": number sau null,
  "sumaDecont": number sau null,
  "operatiuni": [
    {
      "piesa": string,
      "inl": boolean,
      "rev": boolean,
      "rep": boolean,
      "uni": boolean
    }
  ],
  "tipDocumentIdentificat": string
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verificare autentificare utilizator (JWT token valid)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autorizare nepermisă. Token-ul JWT lipsește." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      return new Response(
        JSON.stringify({ error: "Server Supabase neconfigurat corespunzător." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Token JWT invalid sau sesiune expirată." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verificare cheie API Gemini
    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY nu este setat în Supabase Secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fileBase64, mimeType } = await req.json();
    if (!fileBase64) {
      return new Response(
        JSON.stringify({ error: "Fișierul base64 lipsește." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const effectiveMime = mimeType || "application/pdf";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: effectiveMime,
                data: fileBase64,
              },
            },
            {
              text: SYSTEM_PROMPT_ROMANIAN_CLAIMS,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(
        JSON.stringify({ error: `Eroare Gemini API (${resp.status}): ${err}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await resp.json();
    const textOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textOutput) {
      return new Response(
        JSON.stringify({ error: "Răspuns vid de la Gemini API." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extracted = JSON.parse(textOutput);
    return new Response(
      JSON.stringify({ success: true, extracted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Eroare internă în Edge Function" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
