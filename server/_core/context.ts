import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { createClient } from "@supabase/supabase-js";
import * as jose from "jose";

export type User = {
  id: string;
  email: string | null;
  name?: string | null;
  tenantId: string | null;
  role: string;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const ALLOWED_ROLES = ["user", "admin", "owner", "super_admin"] as const;

function parseRole(rawRole: unknown): string {
  if (typeof rawRole === "string" && (ALLOWED_ROLES as readonly string[]).includes(rawRole)) {
    return rawRole;
  }
  return "user";
}

function parseTenantId(appMeta: Record<string, any>): string | null {
  const tenantId = appMeta.tenant_id ?? appMeta.tenantId;
  if (typeof tenantId === "string" && tenantId.trim().length > 0) {
    return tenantId.trim();
  }
  return null;
}

async function verifySupabaseToken(token: string): Promise<User | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  // 1. Intentar verificación con cliente de Supabase (getUser)
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        const u = data.user;
        const appMeta = u.app_metadata || {};
        const userMeta = u.user_metadata || {};
        return {
          id: u.id,
          email: u.email ?? null,
          name: (userMeta.name || appMeta.name || u.email?.split("@")[0]) ?? null,
          tenantId: parseTenantId(appMeta),
          role: parseRole(appMeta.role),
        };
      }
    } catch {
      // Fallback a verificación JWT
    }
  }

  // 2. Verificación criptográfica con SUPABASE_JWT_SECRET únicamente
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (jwtSecret) {
    try {
      const secret = new TextEncoder().encode(jwtSecret);
      const { payload } = await jose.jwtVerify(token, secret);
      if (payload && payload.sub) {
        const appMeta = (payload.app_metadata as Record<string, any>) || {};
        const userMeta = (payload.user_metadata as Record<string, any>) || {};
        return {
          id: payload.sub,
          email: (payload.email as string) ?? null,
          name: (userMeta.name || appMeta.name) ?? null,
          tenantId: parseTenantId(appMeta),
          role: parseRole(appMeta.role),
        };
      }
    } catch {
      // Firma JWT inválida o token expirado
    }
  }

  return null;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const authHeader = opts.req.headers.authorization;
  let token: string | null = null;

  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }

  if (token) {
    try {
      user = await verifySupabaseToken(token);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
