import { createClient } from "@supabase/supabase-js";

const isProductionOrStaging = import.meta.env.PROD || import.meta.env.MODE === "staging";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;

if (isProductionOrStaging && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error("[FATAL Supabase] VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son obligatorias en entorno de producción.");
}

export const supabase = createClient(
  supabaseUrl || "https://demo.supabase.co",
  supabaseAnonKey || "mock-anon-key-for-test"
);
