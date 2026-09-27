import { Request, Response, NextFunction } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenant_id: string;
    role: string;
    email: string;
  };
  token?: string;
}

const VALID_ROLES = ["super_admin", "owner", "admin", "agronomo", "agricultor", "viewer"];

export async function authenticateSupabaseJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    let payload: any;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

    // In unit test suite environment, decode base64 JWT payload for testing
    if (process.env.NODE_ENV === "test") {
      const parts = token.split(".");
      if (parts.length === 3) {
        payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      } else {
        throw new Error("Malformed test token");
      }
    } else {
      if (!supabaseUrl) {
        console.error("[FATAL Auth] SUPABASE_URL non configurado en entorno no-test. Rejeitando solicitudes.");
        return res.status(500).json({ error: "Server Configuration Error: SUPABASE_URL is not configured" });
      }

      const jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
      const { payload: verifiedPayload } = await jwtVerify(token, jwks, {
        issuer: `${supabaseUrl}/auth/v1`,
      });
      payload = verifiedPayload;
    }

    const appMetadata = payload.app_metadata || {};
    const tenant_id = appMetadata.tenant_id;
    const role = appMetadata.role || "viewer";

    if (!tenant_id) {
      return res.status(403).json({ error: "Forbidden: JWT missing required tenant_id in app_metadata" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(403).json({ error: `Forbidden: Invalid role '${role}' in JWT app_metadata` });
    }

    req.user = {
      id: payload.sub || "",
      tenant_id,
      role,
      email: payload.email || "",
    };
    req.token = token;

    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Unauthorized: Invalid JWT token", details: err.message });
  }
}
