import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAuditLogDb, listAuditLogsDb } from "./db/repository";
import { appRouter } from "./routers";
import { getFieldThumbnail } from "./services/copernicus-thumbnail-service";
import type { TRPCContext } from "./_core/trpc";

function createMockContext(user: {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "owner" | "super_admin";
  tenantId: string;
}): TRPCContext {
  return {
    user,
    req: {
      headers: {
        authorization: "Bearer mock-test-token",
      },
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("Audit Log INSERT Integrity & Identity Isolation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("admin.updatePlan cross-tenant operation records the target tenant_id as affected tenant", async () => {
    const caller = appRouter.createCaller(
      createMockContext({
        id: "super-admin-01",
        email: "superadmin@cleanleaf.cl",
        name: "Super Admin",
        role: "super_admin",
        tenantId: "tenant-superadmin",
      })
    );

    const result = await caller.admin.updatePlan({
      tenantId: "target-tenant-b",
      planId: "region_completa",
    });

    expect(result.success).toBe(true);

    const logs = await listAuditLogsDb({ tenant_id: "target-tenant-b", action: "admin.update_plan" });
    expect(logs.length).toBeGreaterThan(0);

    const auditEntry = logs[0];
    expect(auditEntry.tenant_id).toBe("target-tenant-b"); // Affected tenant
    expect(auditEntry.user_id).toBe("super-admin-01");
    expect(auditEntry.user_email).toBe("superadmin@cleanleaf.cl");
    expect(auditEntry.payload).toMatchObject({
      targetTenantId: "target-tenant-b",
      newPlanId: "region_completa",
      actor_type: "human",
      actorTenantId: "tenant-superadmin",
    });
  });

  it("getFieldThumbnail registers audit log with affected tenant_id and actor metadata", async () => {
    const res = await getFieldThumbnail(
      "tenant-org-alpha",
      "sol-123456",
      {
        type: "Polygon",
        coordinates: [[[-72.6, -38.7], [-72.5, -38.7], [-72.5, -38.6], [-72.6, -38.6], [-72.6, -38.7]]],
      },
      "bearer-token-user",
      { userId: "user-field-01", userEmail: "agronomo@org-alpha.cl", actorType: "user" }
    );

    expect(res.thumbnailUrl).toBeDefined();

    const logs = await listAuditLogsDb({ tenant_id: "tenant-org-alpha", action: "copernicus.get_field_thumbnail" });
    expect(logs.length).toBeGreaterThan(0);

    const thumbnailAudit = logs[0];
    expect(thumbnailAudit.tenant_id).toBe("tenant-org-alpha");
    expect(thumbnailAudit.user_id).toBe("user-field-01");
    expect(thumbnailAudit.user_email).toBe("agronomo@org-alpha.cl");
    expect(thumbnailAudit.payload).toMatchObject({
      solicitudId: "sol-123456",
      actor_type: "user",
      status: "success",
    });
  });

  it("prohibits silent memory fallback when DB fails in non-test production environment", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.SUPABASE_URL = "https://mock-prod-instance.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-prod-service-role-key";

    try {
      await expect(
        createAuditLogDb({
          tenant_id: "tenant-prod-fail",
          action: "test.fail",
          entity: "test",
        })
      ).rejects.toThrow();
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });
});
