import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../admin/supabase-client";

export function getSupabaseUserClient(accessToken?: string): SupabaseClient | null {
  if (!accessToken && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return getSupabaseAdminClient();
    } catch {
      // Fallback
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const options: Record<string, any> = {
    auth: { persistSession: false },
  };

  if (accessToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
  }

  return createClient(supabaseUrl, supabaseAnonKey, options);
}
