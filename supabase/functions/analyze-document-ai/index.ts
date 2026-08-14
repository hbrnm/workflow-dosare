import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT_ROMANIAN_CLAIMS = `You are an advanced Document Intelligence Engine designed for an Auto Repair Shop Management System (Service Auto România).
The primary task is to process incoming scanned images, smartphone photos, and digital PDFs of auto claims documents (Certificat de Înmatriculare/Talon, Carte de Identitate/CI, Proces-Verbal de Constatare Daună, Devize de Reparație Audatex/Eurotax/DAT, Facturi Service, Polițe RCA/CASCO).

Return STRICTLY VALID JSON with no Markdown wrappers outside the JSON block.

CRITICAL INSTRUCTIONS:
1. Document Type Classification: Identify one of "TALON" | "CI" | "PV_DAUNA" | "DEVIZ" | "POLITA" | "UNKNOWN".
2. Insurer vs. Repair Shop: "insurance_company" MUST be the Romanian insurance company (e.g., "Omniasig VIG", "Allianz-Țiriac", "Groupama Asigurări", "Generali România", "Asirom VIG", "Grawe România", "Axeria IARD", "Hellas Direct", "Uniqa Asigurări", "Garanta"). DO NOT put the auto repair shop / service name (e.g. "AUTOKLASS", "SERVICE AUTO SRL") in "insurance_company"!
3. TALON (Certificat de Înmatriculare): Extract VIN (Field E, 17 chars), License Plate (Field A), Owner Name (Field C.1.1/C.1.2), Brand/Model (Field D.1/D.3), First Registration Date (Field B), Engine Code/Power (Field P.1/P.2).
4. CI (Carte de Identitate): Extract CNP (13 digits), Full Name, Address/Domiciliu, ID Series & Number.
5. PV_DAUNA / DEVIZ: Extract Claim Number, Insurer, Insured Person / Client, Damaged Parts / Operations (with INL / REV / REP / D_R flags), Labor Totals, Parts Totals, Paint Material Totals, Subtotal (Netto), Total (Brutto).

JSON Output Structure:
{
  "status": "SUCCESS",
  "document_type": "TALON" | "CI" | "PV_DAUNA" | "DEVIZ" | "POLITA" | "UNKNOWN",
  "confidence_score": 0.95,
  "data": {
    "numarDosar": string sau null,
    "claim_number": string sau null,
    "insurance_company": string sau null,
    "insurance_type": "RCA" | "CASCO",
    "client_name": string sau null,
    "client_phone": string sau null,
    "cnp": string sau null,
    "address": string sau null,
    "id_series_number": string sau null,
    "delegate_name": string sau null,
    "license_plate": string sau null,
    "vehicle_vin": string sau null,
    "vehicle_make": string sau null,
    "vehicle_model": string sau null,
    "mileage_km": number sau null,
    "first_registration_date": string sau null,
    "engine_power": string sau null,
    "claim_inspector": string sau null,
    "damage_summary": string sau null,
    "vendor_name": string sau null,
    "vendor_cui": string sau null,
    "parts_total": number sau null,
    "labor_total": number sau null,
    "labor_paint_total": number sau null,
    "paint_materials_total": number sau null,
    "additional_costs_total": number sau null,
    "subtotal_amount": number sau null,
    "vat_amount": number sau null,
    "total_amount": number sau null,
    "deductible_amount": number sau null,
    "line_items": [
      {
        "description": string,
        "quantity": number sau 1,
        "unit_price": number sau 0,
        "total_price": number sau 0,
        "inl": boolean,
        "rev": boolean,
        "rep": boolean,
        "uni": boolean
      }
    ]
  },
  "extraction_flags": []
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
