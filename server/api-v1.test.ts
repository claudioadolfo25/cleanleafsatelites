import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { apiV1Router } from "./routes/api-v1";

const app = express();
app.use(express.json());
app.use("/api/v1", apiV1Router);

function createTestToken(payload: object) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64");
  return `${header}.${body}.mock-signature`;
}

describe("Express REST API v1 Authentication & Routing", () => {
  it("GET /api/v1/health allows unauthenticated access", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });

  it("GET /api/v1/predios rejects requests without Authorization header", async () => {
    const res = await request(app).get("/api/v1/predios");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/predios rejects JWT without app_metadata tenant_id", async () => {
    const token = createTestToken({ sub: "user-1", email: "test@example.com" });
    const res = await request(app)
      .get("/api/v1/predios")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("tenant_id");
  });

  it("GET /api/v1/predios accepts valid JWT with tenant_id in app_metadata", async () => {
    const token = createTestToken({
      sub: "user-1",
      email: "test@example.com",
      app_metadata: { tenant_id: "11111111-1111-1111-1111-111111111111", role: "admin" },
    });
    const res = await request(app)
      .get("/api/v1/predios")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /api/v1/solicitudes validates satellite vertical selection", async () => {
    const token = createTestToken({
      sub: "user-1",
      email: "test@example.com",
      app_metadata: { tenant_id: "11111111-1111-1111-1111-111111111111", role: "admin" },
    });
    const res = await request(app)
      .post("/api/v1/solicitudes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        superficie_ha: 20,
        vertical: "agricultura",
        satelites_solicitados: ["sentinel-3"], // Invalid for agriculture
        idempotency_key: "idempotency-1",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid satellite");
  });
});

describe("Express REST API v1 Security: eventos_pago, user_roles, invitaciones", () => {
  const tenantAToken = createTestToken({
    sub: "user-a1",
    email: "user@tenant-a.com",
    app_metadata: { tenant_id: "11111111-1111-1111-1111-111111111111", role: "admin" },
  });

  const tenantBUserToken = createTestToken({
    sub: "user-b1",
    email: "user@tenant-b.com",
    app_metadata: { tenant_id: "22222222-2222-2222-2222-222222222222", role: "agricultor" },
  });

  it("GET /api/v1/pagos/eventos rejects non-admin/owner roles", async () => {
    const res = await request(app)
      .get("/api/v1/pagos/eventos")
      .set("Authorization", `Bearer ${tenantBUserToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("insufficient role privileges");
  });

  it("POST /api/v1/pagos/eventos blocks cross-tenant payment event creation", async () => {
    const res = await request(app)
      .post("/api/v1/pagos/eventos")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({
        tenant_id: "22222222-2222-2222-2222-222222222222", // Cross-tenant attempt
        event_id: "evt-123",
        proveedor: "stripe",
        tipo_evento: "subscription.activated",
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("cannot create payment events for another tenant");
  });

  it("POST /api/v1/invitaciones prevents cross-tenant invitations and non-admin senders", async () => {
    // Non-admin attempting invitation
    const res1 = await request(app)
      .post("/api/v1/invitaciones")
      .set("Authorization", `Bearer ${tenantBUserToken}`)
      .send({
        email: "invite@example.com",
        role: "agricultor",
      });
    expect(res1.status).toBe(403);

    // Cross-tenant invitation attempt
    const res2 = await request(app)
      .post("/api/v1/invitaciones")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({
        tenant_id: "22222222-2222-2222-2222-222222222222",
        email: "invite@example.com",
        role: "agricultor",
      });
    expect(res2.status).toBe(403);
    expect(res2.body.error).toContain("cannot send invitations for another tenant");
  });

  it("POST /api/v1/roles prevents non-admin role management, privilege escalation and cross-tenant role assignment", async () => {
    // Cross-tenant role assignment attempt
    const res1 = await request(app)
      .post("/api/v1/roles")
      .set("Authorization", `Bearer ${tenantAToken}`)
      .send({
        user_id: "target-user-1",
        tenant_id: "22222222-2222-2222-2222-222222222222",
        role: "agronomo",
      });
    expect(res1.status).toBe(403);

    // Privilege escalation attempt (agricultor trying to assign owner role)
    const res2 = await request(app)
      .post("/api/v1/roles")
      .set("Authorization", `Bearer ${tenantBUserToken}`)
      .send({
        user_id: "user-b1",
        role: "owner",
      });
    expect(res2.status).toBe(403);
    expect(res2.body.error).toContain("insufficient role privileges");
  });
});
