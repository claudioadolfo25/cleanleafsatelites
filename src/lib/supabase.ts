import { createClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl = process.env.SUPABASE_URL || "https://demo.supabase.co";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "demo-anon-key";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    supabaseUrl,
    supabaseAnonKey,
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
