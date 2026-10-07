import { createClient } from "@supabase/supabase-js";

const isTestEnv = process.env.NODE_ENV === "test";

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const rawAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!isTestEnv) {
  if (!rawUrl || !rawAnonKey || !rawServiceRoleKey) {
    throw new Error(
      "[FATAL] Missing required Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY). Fail-fast active."
    );
  }
}

const SUPABASE_URL = rawUrl || "https://example.supabase.co";
const SUPABASE_ANON_KEY = rawAnonKey || "mock-anon-key";
const SUPABASE_SERVICE_ROLE_KEY = rawServiceRoleKey || "mock-service-role-key";

/**
 * Creates a Supabase client configured with the end user's JWT token.
 * This guarantees that PostgreSQL RLS policies evaluate against the user's claims.
 */
export function getSupabaseUserClient(userJwt: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
    },
  });
}

/**
 * Isolated platform admin client using service_role key.
 * Strictly reserved for workers, webhooks, and system tasks with audit logging.
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
