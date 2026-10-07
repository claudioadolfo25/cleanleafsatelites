import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isTest = process.env.NODE_ENV === "test";

  if (!supabaseUrl || !serviceRoleKey) {
    if (isTest) {
      return createClient("https://demo.supabase.co", "mock-service-role-key-for-test");
    }
    throw new Error(
      "SUPABASE_CREDENTIALS_MISSING: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in non-test environments."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
