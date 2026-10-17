import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClientInstance: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClientInstance) {
    return adminClientInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin/worker operations.");
  }
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is required for admin/worker operations.");
  }

  adminClientInstance = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return adminClientInstance;
}
