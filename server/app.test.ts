import { describe, expect, it } from "vitest";
import request from "supertest";
import * as jose from "jose";
import { createApp } from "./app";

async function createMockJwt(payload: Record<string, unknown> = {}) {
  const secret = new TextEncoder().encode("test-jwt-secret-12345678901234567890");
  return new jose.SignJWT({
    sub: "usr_test_123",
    email: "test@cleanleaf.cl",
    app_metadata: { tenant_id: "tenant-test-99", role: "user" },
    ...payload,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret);
}

describe("Express App Integration & tRPC Auth Bridge", () => {
  const app = createApp();

  it("GET /api/health responds with 200 OK and env checks JSON", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toMatchObject({
      status: "ok",
      service: "agropulso-cleanleaf-api",
      checks: expect.objectContaining({
        supabaseUrl: expect.any(Boolean),
        supabaseAnonKey: expect.any(Boolean),
        copernicusClientId: expect.any(Boolean),
        copernicusClientSecret: expect.any(Boolean),
      }),
    });
  });

  it("GET /api/ruta-inexistente responds with 404 JSON (never HTML)", async () => {
    const res = await request(app).get("/api/ruta-inexistente");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toMatchObject({
      error: {
        code: "NOT_FOUND",
        message: "API route not found",
      },
    });
  });

  describe("Procedimientos Públicos (Permitidos sin sesión)", () => {
    it("GET /api/trpc/system.health responde 200 OK JSON sin token", async () => {
      const inputParam = encodeURIComponent(JSON.stringify({ "0": { json: { timestamp: 1700000000000 } } }));
      const res = await request(app).get(`/api/trpc/system.health?batch=1&input=${inputParam}`);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body[0].result.data.json).toEqual({ ok: true });
    });

    it("GET /api/trpc/apiV1.health responde 200 OK JSON sin token", async () => {
      const res = await request(app).get("/api/trpc/apiV1.health");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.result.data.json).toMatchObject({ data: { api: "v1" } });
    });

    it("GET /api/trpc/cleanleaf.catalog responde 200 OK JSON sin token", async () => {
      const res = await request(app).get("/api/trpc/cleanleaf.catalog");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.result.data).toBeDefined();
    });

    it("GET /api/trpc/cleanleaf.configStatus responde 200 OK JSON sin token", async () => {
      const res = await request(app).get("/api/trpc/cleanleaf.configStatus");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.result.data).toBeDefined();
    });
  });

  describe("Procedimientos Protegidos (Rechazo sin sesión -> UNAUTHORIZED JSON)", () => {
    const protectedGetEndpoints = [
      "cleanleaf.dashboard",
      "cleanleaf.reports.list",
      "cleanleaf.resources",
      "auth.me",
    ];

    for (const endpoint of protectedGetEndpoints) {
      it(`GET /api/trpc/${endpoint} sin token responde UNAUTHORIZED en JSON (nunca HTML)`, async () => {
        const res = await request(app).get(`/api/trpc/${endpoint}`);
        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.text).not.toContain("<html>");
        expect(res.text).not.toContain("The page could not be found");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error.json.message).toContain("Please login");
        expect(res.body.error.json.data.code).toBe("UNAUTHORIZED");
      });
    }

    it("GET /api/trpc/cleanleaf.reports.getById sin token responde UNAUTHORIZED en JSON", async () => {
      const input = encodeURIComponent(JSON.stringify({ json: { id: "sol-123" } }));
      const res = await request(app).get(`/api/trpc/cleanleaf.reports.getById?input=${input}`);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.text).not.toContain("<html>");
      expect(res.status).toBe(401);
      expect(res.body.error.json.message).toContain("Please login");
      expect(res.body.error.json.data.code).toBe("UNAUTHORIZED");
    });

    const protectedPostEndpoints = [
      "auth.logout",
      "cleanleaf.catalogSearch",
      "cleanleaf.createAnalysis",
      "apiV1.solicitudes.create",
      "apiV1.onboarding.createTenant",
      "apiV1.apiKeys.create",
    ];

    for (const endpoint of protectedPostEndpoints) {
      it(`POST /api/trpc/${endpoint} sin token responde UNAUTHORIZED en JSON (nunca HTML)`, async () => {
        const res = await request(app).post(`/api/trpc/${endpoint}`).send({ "0": { json: {} } });
        expect(res.headers["content-type"]).toMatch(/json/);
        expect(res.text).not.toContain("<html>");
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error.json.message).toContain("Please login");
        expect(res.body.error.json.data.code).toBe("UNAUTHORIZED");
      });
    }
  });

  describe("Procedimientos Protegidos (Acceso exitoso con Bearer token válido)", () => {
    it("GET /api/trpc/auth.me con Bearer token responde 200 OK y devuelve datos del usuario", async () => {
      const token = await createMockJwt({
        sub: "usr_abc_123",
        email: "agronomo@fundo.cl",
        user_metadata: { name: "Juan Agrónomo" },
        app_metadata: { tenant_id: "tenant-fundo-1", role: "user" },
      });

      const res = await request(app)
        .get("/api/trpc/auth.me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.result.data.json).toEqual({
        id: "usr_abc_123",
        email: "agronomo@fundo.cl",
        name: "Juan Agrónomo",
        tenantId: "tenant-fundo-1",
        role: "user",
      });
    });

    it("GET /api/trpc/cleanleaf.dashboard con Bearer token responde 200 OK JSON", async () => {
      const token = await createMockJwt();
      const res = await request(app)
        .get("/api/trpc/cleanleaf.dashboard")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.result.data.json).toHaveProperty("tenant");
      expect(res.body.result.data.json).toHaveProperty("predios");
    });

    it("GET /api/trpc/cleanleaf.reports.list con Bearer token responde 200 OK JSON", async () => {
      const token = await createMockJwt();
      const res = await request(app)
        .get("/api/trpc/cleanleaf.reports.list")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.result.data.json).toBeDefined();
    });

    it("POST /api/trpc/cleanleaf.createAnalysis con Bearer token crea solicitud aislada por tenant", async () => {
      const token = await createMockJwt({
        app_metadata: { tenant_id: "tenant-valdivia", role: "user" },
      });

      const payload = {
        json: {
          predioId: "predio-1",
          predioNombre: "Predio Valdivia",
          hectareas: 25,
          vertical: "agricultura",
          satellites: ["sentinel-2"],
          variables: ["ndvi"],
          idempotencyKey: "test-idempotency-key-01",
        },
      };

      const res = await request(app)
        .post("/api/trpc/cleanleaf.createAnalysis")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.result.data.json).toHaveProperty("id");
      expect(res.body.result.data.json.idempotencyKey).toBe("tenant-valdivia:test-idempotency-key-01");
    });

    it("POST /api/trpc/apiV1.solicitudes.create con Bearer token responde 200 OK con datos de solicitud", async () => {
      const token = await createMockJwt({
        app_metadata: { tenant_id: "tenant-osorno", role: "user" },
      });

      const payload = {
        json: {
          predioId: "predio-osorno",
          predioNombre: "Fundo Osorno",
          hectareas: 50,
          vertical: "agricultura",
          satellites: ["sentinel-2"],
          variables: ["ndvi"],
          idempotencyKey: "test-idempotency-key-02",
        },
      };

      const res = await request(app)
        .post("/api/trpc/apiV1.solicitudes.create")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.result.data.json.data).toHaveProperty("id");
      expect(res.body.result.data.json.data.idempotencyKey).toBe("tenant-osorno:test-idempotency-key-02");
    });

    it("POST /api/trpc/apiV1.onboarding.createTenant con Bearer token responde 200 OK JSON", async () => {
      const token = await createMockJwt();
      const payload = {
        json: {
          organizationName: "Agrícola del Sur",
          planId: "piloto",
        },
      };

      const res = await request(app)
        .post("/api/trpc/apiV1.onboarding.createTenant")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.result.data.json.data).toMatchObject({
        nombre: "Agrícola del Sur",
        planId: "piloto",
      });
    });

    it("POST /api/trpc/apiV1.apiKeys.create con Bearer token responde 200 OK JSON", async () => {
      const token = await createMockJwt();
      const payload = {
        json: {
          tenantId: "tenant-test-99",
          nombre: "Production Key",
        },
      };

      const res = await request(app)
        .post("/api/trpc/apiV1.apiKeys.create")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.result.data.json.data).toHaveProperty("key");
      expect(res.body.result.data.json.data.key).toMatch(/^cl_/);
    });
  });

  describe("Aislamiento Multi-Tenant (RLS & Filtrado Estricto por Tenant)", () => {
    it("impide que un usuario del Tenant B lea un informe creado por el Tenant A", async () => {
      const tokenTenantA = await createMockJwt({
        sub: "usr_tenant_a",
        email: "usuarioA@tenantA.cl",
        app_metadata: { tenant_id: "tenant-alpha-100", role: "user" },
      });

      const tokenTenantB = await createMockJwt({
        sub: "usr_tenant_b",
        email: "usuarioB@tenantB.cl",
        app_metadata: { tenant_id: "tenant-beta-200", role: "user" },
      });

      // 1. Tenant A crea un análisis
      const createRes = await request(app)
        .post("/api/trpc/cleanleaf.createAnalysis")
        .set("Authorization", `Bearer ${tokenTenantA}`)
        .send({
          json: {
            predioId: "predio-a1",
            predioNombre: "Fundo Alpha",
            hectareas: 30,
            vertical: "agricultura",
            satellites: ["sentinel-2"],
            variables: ["ndvi"],
            idempotencyKey: "unique-key-tenant-alpha-001",
          },
        });

      expect(createRes.status).toBe(200);
      const solicitudIdTenantA = createRes.body.result.data.json.id;

      // 2. Tenant B intenta leer el informe de Tenant A por ID -> debe devolver null (no encontrado/no autorizado)
      const inputParam = encodeURIComponent(JSON.stringify({ json: { id: solicitudIdTenantA } }));
      const getByIdRes = await request(app)
        .get(`/api/trpc/cleanleaf.reports.getById?input=${inputParam}`)
        .set("Authorization", `Bearer ${tokenTenantB}`);

      expect(getByIdRes.status).toBe(200);
      expect(getByIdRes.body.result.data.json).toBeNull();

      // 3. Tenant B lista sus informes -> el informe del Tenant A NO debe aparecer
      const listResTenantB = await request(app)
        .get("/api/trpc/cleanleaf.reports.list")
        .set("Authorization", `Bearer ${tokenTenantB}`);

      expect(listResTenantB.status).toBe(200);
      const reportsTenantB = listResTenantB.body.result.data.json;
      const foundInTenantB = Array.isArray(reportsTenantB) && reportsTenantB.some((r: any) => r.id === solicitudIdTenantA || r.solicitudId === solicitudIdTenantA);
      expect(foundInTenantB).toBe(false);

      // 4. Tenant A lista sus informes -> el informe SÍ aparece para Tenant A
      const listResTenantA = await request(app)
        .get("/api/trpc/cleanleaf.reports.list")
        .set("Authorization", `Bearer ${tokenTenantA}`);

      expect(listResTenantA.status).toBe(200);
      const reportsTenantA = listResTenantA.body.result.data.json;
      const foundInTenantA = Array.isArray(reportsTenantA) && reportsTenantA.some((r: any) => r.id === solicitudIdTenantA || r.solicitudId === solicitudIdTenantA);
      expect(foundInTenantA).toBe(true);
    });
  });
});
