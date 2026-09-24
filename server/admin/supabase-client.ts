import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://example.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "mock-anon-key";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "mock-service-role-key";

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
