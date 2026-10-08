import { createClient } from "@supabase/supabase-js";

const isProductionOrStaging = import.meta.env.PROD || import.meta.env.MODE === "staging";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (isProductionOrStaging && (!supabaseUrl || !supabaseAnonKey)) {
  console.error("[FATAL Supabase] VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son obligatorias en producción/staging.");
}

const finalUrl = supabaseUrl || "https://demo.supabase.co";
const finalKey = supabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-anon-key";

export const supabase = createClient(finalUrl, finalKey);
