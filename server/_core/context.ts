import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { authenticateSupabaseRequest, type SupabaseIdentity } from "../supabase-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  supabaseIdentity: SupabaseIdentity | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let supabaseIdentity: SupabaseIdentity | null = null;

  const authorization = opts.req.headers.authorization;
  const hasBearerToken = typeof authorization === "string" && /^Bearer\s+\S+$/i.test(authorization);
  if (hasBearerToken) {
    try {
      supabaseIdentity = await authenticateSupabaseRequest(opts.req);
    } catch {
      // Protected procedures reject this request; never fall back to a tenant.
      supabaseIdentity = null;
    }
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    supabaseIdentity,
  };
}
