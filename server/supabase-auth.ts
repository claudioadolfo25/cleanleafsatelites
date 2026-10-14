import { createClient, type User } from "@supabase/supabase-js";
import { decodeJwt } from "jose";
import type { Request } from "express";

export type SupabaseIdentity = {
  userId: string;
  tenantId: string;
  email: string | null;
};

export type SupabaseAuthClient = {
  auth: {
    getUser: (accessToken: string) => Promise<{ data: { user: User | null }; error: { message: string } | null }>;
  };
};

let authClient: SupabaseAuthClient | null | undefined;

export function resetSupabaseAuthForTests() {
  authClient = undefined;
}

function getAuthClient(): SupabaseAuthClient | null {
  if (authClient !== undefined) return authClient;
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    authClient = null;
    return authClient;
  }
  authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as SupabaseAuthClient;
  return authClient;
}

function bearerToken(req: Request): string | null {
  const value = req.headers.authorization;
  if (typeof value !== "string" || !/^Bearer\s+\S+$/i.test(value)) return null;
  return value.replace(/^Bearer\s+/i, "").trim();
}

function validTenantClaim(payload: Record<string, unknown>): string | null {
  const tenantId = payload.tenant_id;
  return typeof tenantId === "string" && tenantId.trim().length > 0 ? tenantId : null;
}

/**
 * Supabase Auth validates the bearer token server-side. The JWT payload is only
 * decoded after that validation and is accepted only when `sub` matches the
 * validated Supabase user and a tenant_id claim is present.
 */
export async function authenticateSupabaseRequest(req: Request): Promise<SupabaseIdentity | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const client = getAuthClient();
  if (!client) throw new Error("Supabase Auth backend no está configurado");

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id) throw new Error("JWT de Supabase inválido");

  let payload: Record<string, unknown>;
  try {
    payload = decodeJwt(token) as Record<string, unknown>;
  } catch {
    throw new Error("JWT de Supabase malformado");
  }
  const userId = payload.sub;
  const tenantId = validTenantClaim(payload);
  if (userId !== data.user.id) throw new Error("El subject del JWT no coincide con el usuario validado");
  if (!tenantId) throw new Error("El JWT de Supabase no contiene tenant_id");

  // In production SUPABASE_TENANT_ID is never a source of identity. In an
  // explicit staging setup it may only assert the claim, never replace it.
  if (process.env.APP_ENV === "staging" && process.env.SUPABASE_TENANT_ID && process.env.SUPABASE_TENANT_ID !== tenantId) {
    throw new Error("El tenant_id del JWT no coincide con el tenant de staging");
  }

  return { userId: data.user.id, tenantId, email: data.user.email ?? null };
}

export function supabaseBearerTokenForTests(req: Request): string | null {
  return bearerToken(req);
}

export function setSupabaseAuthClientForTests(client: SupabaseAuthClient | null) {
  authClient = client;
}
