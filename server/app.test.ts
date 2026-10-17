import { describe, expect, it } from "vitest";
import request from "supertest";
import * as jose from "jose";
import { createApp } from "./app";
import { computeBBox, computePolygonAreaHa, geoJSONGeometrySchema, type GeoJSONGeometry } from "./geometry";

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

const validValdiviaPolygon: GeoJSONGeometry = {
  type: "Polygon",
  coordinates: [[
    [-73.2500, -39.8200],
    [-73.2300, -39.8200],
    [-73.2300, -39.8000],
    [-73.2500, -39.8000],
    [-73.2500, -39.8200],
  ]],
};

const validOsornoPolygon: GeoJSONGeometry = {
  type: "Polygon",
  coordinates: [[
    [-73.1500, -40.5800],
    [-73.1300, -40.5800],
    [-73.1300, -40.5600],
    [-73.1500, -40.5600],
    [-73.1500, -40.5800],
  ]],
};

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

  describe("Validación de Geometría, Cálculo de Superficie y BBOX", () => {
    it("valida polígonos GeoJSON correctos en WGS84", () => {
      const parsed = geoJSONGeometrySchema.safeParse(validValdiviaPolygon);
      expect(parsed.success).toBe(true);
    });

    it("rechaza polígonos con anillo no cerrado (primer y último punto no coinciden)", () => {
      const openPolygon = {
        type: "Polygon",
        coordinates: [[
          [-73.2500, -39.8200],
          [-73.2300, -39.8200],
          [-73.2300, -39.8000],
          [-73.2500, -39.8000], // Sin cerrar
        ]],
      };
      const parsed = geoJSONGeometrySchema.safeParse(openPolygon);
      expect(parsed.success).toBe(false);
    });

    it("rechaza coordenadas fuera de rango WGS84", () => {
      const outOfRange = {
        type: "Polygon",
        coordinates: [[
          [-195.0000, -39.8200], // Longitud < -180
          [-73.2300, -39.8200],
          [-73.2300, -39.8000],
          [-195.0000, -39.8000],
          [-195.0000, -39.8200],
        ]],
      };
      const parsed = geoJSONGeometrySchema.safeParse(outOfRange);
      expect(parsed.success).toBe(false);
    });

    it("calcula la superficie en hectáreas de forma consistente en el servidor", () => {
      const areaValdiviaHa = computePolygonAreaHa(validValdiviaPolygon);
      expect(areaValdiviaHa).toBeGreaterThan(100);
      expect(areaValdiviaHa).toBeLessThan(1000);
    });

    it("deriva el BBOX exacto [minLng, minLat, maxLng, maxLat] desde el polígono", () => {
      const bbox = computeBBox(validValdiviaPolygon);
      expect(bbox).toEqual([-73.25, -39.82, -73.23, -39.8]);
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
      "predios.list",
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
      "predios.create",
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

  describe("Gestión de Predios y Generación Dinámica de BBOX en Análisis", () => {
    it("confirma que dos predios en distintas ubicaciones generen BBOX distintos en la consulta de análisis", async () => {
      const token = await createMockJwt({
        app_metadata: { tenant_id: "tenant-geo-test", role: "user" },
      });

      // 1. Crear Predio Valdivia
      const createValdiviaRes = await request(app)
        .post("/api/trpc/predios.create")
        .set("Authorization", `Bearer ${token}`)
        .send({
          json: {
            nombre: "Predio Valdivia Real",
            geometria: validValdiviaPolygon,
            comuna: "Valdivia",
          },
        });

      expect(createValdiviaRes.status).toBe(200);
      const valdiviaPredioId = createValdiviaRes.body.result.data.json.id;

      // 2. Crear Predio Osorno
      const createOsornoRes = await request(app)
        .post("/api/trpc/predios.create")
        .set("Authorization", `Bearer ${token}`)
        .send({
          json: {
            nombre: "Fundo Osorno Real",
            geometria: validOsornoPolygon,
            comuna: "Osorno",
          },
        });

      expect(createOsornoRes.status).toBe(200);
      const osornoPredioId = createOsornoRes.body.result.data.json.id;

      // 3. Crear Análisis para Predio Valdivia
      const analysisValdiviaRes = await request(app)
        .post("/api/trpc/cleanleaf.createAnalysis")
        .set("Authorization", `Bearer ${token}`)
        .send({
          json: {
            predioId: valdiviaPredioId,
            vertical: "agricultura",
            satellites: ["sentinel-2"],
            variables: ["ndvi"],
            idempotencyKey: "idempotency-key-valdivia-01",
          },
        });

      expect(analysisValdiviaRes.status).toBe(200);
      const bboxValdivia = analysisValdiviaRes.body.result.data.json.bbox;

      // 4. Crear Análisis para Predio Osorno
      const analysisOsornoRes = await request(app)
        .post("/api/trpc/cleanleaf.createAnalysis")
        .set("Authorization", `Bearer ${token}`)
        .send({
          json: {
            predioId: osornoPredioId,
            vertical: "agricultura",
            satellites: ["sentinel-2"],
            variables: ["ndvi"],
            idempotencyKey: "idempotency-key-osorno-01",
          },
        });

      expect(analysisOsornoRes.status).toBe(200);
      const bboxOsorno = analysisOsornoRes.body.result.data.json.bbox;

      // 5. Verificar que BBOX de Valdivia y Osorno son completamente distintos
      expect(bboxValdivia).toEqual([-73.25, -39.82, -73.23, -39.8]);
      expect(bboxOsorno).toEqual([-73.15, -40.58, -73.13, -40.56]);
      expect(bboxValdivia).not.toEqual(bboxOsorno);
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

    it("impide que un usuario del Tenant B consulte o elimine predios del Tenant A", async () => {
      const tokenTenantA = await createMockJwt({
        app_metadata: { tenant_id: "tenant-owner-a", role: "user" },
      });

      const tokenTenantB = await createMockJwt({
        app_metadata: { tenant_id: "tenant-owner-b", role: "user" },
      });

      // 1. Tenant A crea un predio
      const createRes = await request(app)
        .post("/api/trpc/predios.create")
        .set("Authorization", `Bearer ${tokenTenantA}`)
        .send({
          json: {
            nombre: "Predio Privado Tenant A",
            geometria: validValdiviaPolygon,
          },
        });

      expect(createRes.status).toBe(200);
      const predioIdTenantA = createRes.body.result.data.json.id;

      // 2. Tenant B consulta predios -> no ve el predio de Tenant A
      const listResTenantB = await request(app)
        .get("/api/trpc/predios.list")
        .set("Authorization", `Bearer ${tokenTenantB}`);

      expect(listResTenantB.status).toBe(200);
      const prediosTenantB = listResTenantB.body.result.data.json;
      expect(prediosTenantB.some((p: any) => p.id === predioIdTenantA)).toBe(false);

      // 3. Tenant B intenta eliminar el predio de Tenant A -> responde 404 NOT_FOUND
      const deleteRes = await request(app)
        .post("/api/trpc/predios.delete")
        .set("Authorization", `Bearer ${tokenTenantB}`)
        .send({
          json: { id: predioIdTenantA },
        });

      expect(deleteRes.status).toBe(404);
    });
  });
});
