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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://example.supabase.co";
const JWKS_URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!JWKS) {
    JWKS = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return JWKS;
}

export async function authenticateSupabaseJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    let payload: any;
    if (process.env.NODE_ENV === "test" || !process.env.SUPABASE_URL) {
      // Stub decode for unit testing/mock mode when no live Supabase instance is attached
      const parts = token.split(".");
      if (parts.length === 3) {
        payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
      } else {
        throw new Error("Malformed test token");
      }
    } else {
      const { payload: verifiedPayload } = await jwtVerify(token, getJWKS(), {
        issuer: `${SUPABASE_URL}/auth/v1`,
      });
      payload = verifiedPayload;
    }

    const appMetadata = payload.app_metadata || {};
    const tenant_id = appMetadata.tenant_id;
    const role = appMetadata.role || "viewer";

    if (!tenant_id) {
      return res.status(403).json({ error: "Forbidden: JWT missing required tenant_id in app_metadata" });
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
