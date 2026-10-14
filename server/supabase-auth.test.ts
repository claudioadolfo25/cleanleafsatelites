import { describe, expect, it, beforeEach } from "vitest";
import { SignJWT } from "jose";
import type { Request } from "express";
import { authenticateSupabaseRequest, resetSupabaseAuthForTests, setSupabaseAuthClientForTests, type SupabaseAuthClient } from "./supabase-auth";

const userId = "00000000-0000-0000-0000-000000000001";
const tenantId = "00000000-0000-0000-0000-000000000010";
const req = (authorization?: string) => ({ headers: authorization ? { authorization } : {} } as Request);
const token = (claims: Record<string, unknown>) => new SignJWT({ ...claims }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode("test-secret"));

function authClientFor(expectedUserId = userId): SupabaseAuthClient {
  return { auth: { getUser: async () => ({ data: { user: { id: expectedUserId, email: "qa@example.com" } as any }, error: null }) } };
}

describe("Supabase backend JWT identity", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-test-key";
    delete process.env.APP_ENV;
    delete process.env.SUPABASE_TENANT_ID;
    resetSupabaseAuthForTests();
  });

  it("deriva user_id y tenant_id del JWT después de validarlo", async () => {
    setSupabaseAuthClientForTests(authClientFor());
    const identity = await authenticateSupabaseRequest(req(`Bearer ${await token({ sub: userId, tenant_id: tenantId })}`));
    expect(identity).toEqual({ userId, tenantId, email: "qa@example.com" });
  });

  it("rechaza token ausente, inválido y usuario sin tenant", async () => {
    setSupabaseAuthClientForTests(authClientFor());
    expect(await authenticateSupabaseRequest(req())).toBeNull();
    await expect(authenticateSupabaseRequest(req("Bearer not-a-jwt"))).rejects.toThrow();
    await expect(authenticateSupabaseRequest(req(`Bearer ${await token({ sub: userId })}`))).rejects.toThrow(/tenant_id/);
  });

  it("rechaza un JWT cuyo subject no coincide con el usuario validado", async () => {
    setSupabaseAuthClientForTests(authClientFor("00000000-0000-0000-0000-000000000002"));
    await expect(authenticateSupabaseRequest(req(`Bearer ${await token({ sub: userId, tenant_id: tenantId })}`))).rejects.toThrow(/subject/);
  });

  it("no usa SUPABASE_TENANT_ID como tenant por defecto en producción", async () => {
    process.env.APP_ENV = "production";
    process.env.SUPABASE_TENANT_ID = tenantId;
    setSupabaseAuthClientForTests(authClientFor());
    await expect(authenticateSupabaseRequest(req(`Bearer ${await token({ sub: userId })}`))).rejects.toThrow(/tenant_id/);
  });
});
