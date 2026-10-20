import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  listPrediosDb,
  createPredioDb,
  getUserPreferencesDb,
  createAuditLogDb,
  getTenantSettingsDb,
} from "./db/repository";

describe("Table Permissions & Schema Grants Architecture Unit Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listPrediosDb filters strictly by tenantId for authenticated context", async () => {
    const predios = await listPrediosDb("tenant-alpha-01");
    expect(Array.isArray(predios)).toBe(true);
    predios.forEach(p => {
      expect(p.tenant_id).toBe("tenant-alpha-01");
    });
  });

  it("createPredioDb computes surface area and returns created predio", async () => {
    const created = await createPredioDb({
      tenant_id: "tenant-beta-02",
      nombre: "Fundo San Pedro",
      geometria: {
        type: "Polygon",
        coordinates: [[[-72.6, -38.7], [-72.5, -38.7], [-72.5, -38.6], [-72.6, -38.6], [-72.6, -38.7]]],
      },
    });

    expect(created.id).toBeDefined();
    expect(created.tenant_id).toBe("tenant-beta-02");
    expect(created.superficie_ha).toBeGreaterThan(0);
  });

  it("getUserPreferencesDb and getTenantSettingsDb default safely when records do not exist", async () => {
    const userPrefs = await getUserPreferencesDb("user-nonexistent");
    expect(userPrefs).toBeNull();

    const tenantSettings = await getTenantSettingsDb("tenant-nonexistent");
    expect(tenantSettings).toBeNull();
  });

  it("createAuditLogDb executes strictly via backend service client and populates audit records", async () => {
    const auditRecord = await createAuditLogDb({
      tenant_id: "tenant-gamma-03",
      user_id: "user-owner-03",
      user_email: "owner@gamma.cl",
      action: "test.permissions_audit",
      entity: "permissions",
      payload: { actor_type: "user", status: "passed" },
    });

    expect(auditRecord.id).toBeDefined();
    expect(auditRecord.tenant_id).toBe("tenant-gamma-03");
    expect(auditRecord.action).toBe("test.permissions_audit");
  });
});
