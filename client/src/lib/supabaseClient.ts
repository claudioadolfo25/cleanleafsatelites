import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.MODE !== "test") {
    console.error("CRITICAL_CONFIG_ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be configured.");
  }
}

export const supabase = createClient(
  supabaseUrl || "https://demo.supabase.co",
  supabaseAnonKey || "mock-anon-key-for-test"
);
