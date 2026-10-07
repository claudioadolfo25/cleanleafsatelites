import { createClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === "production" || process.env.APP_ENV === "production") {
      throw new Error("[Supabase Config Error] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en producción.");
    }
  }

  return {
    supabaseUrl: supabaseUrl || "https://placeholder-project.supabase.co",
    supabaseAnonKey: supabaseAnonKey || "placeholder-anon-key",
    supabaseServiceRoleKey,
  };
}

const config = getSupabaseConfig();

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

export function getSupabaseAdminClient() {
  if (!config.supabaseServiceRoleKey) {
    return supabase;
  }
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
}
