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
