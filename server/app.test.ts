import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";

describe("Express Serverless App Integration", () => {
  const app = createApp();

  it("GET /api/health responds with 200 OK and environment status JSON", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toMatchObject({
      status: "ok",
      service: "agropulso-cleanleaf-api",
      env: expect.objectContaining({
        supabaseUrl: expect.any(Boolean),
        supabaseAnonKey: expect.any(Boolean),
        copernicusClientId: expect.any(Boolean),
        copernicusClientSecret: expect.any(Boolean),
      }),
    });
  });

  it("GET /api/trpc/cleanleaf.dashboard responds with 200 OK JSON (never HTML)", async () => {
    const res = await request(app).get("/api/trpc/cleanleaf.dashboard");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.text).not.toContain("<html>");
    expect(res.text).not.toContain("The page could not be found");
    expect(res.body).toHaveProperty("result");
    expect(res.body.result).toHaveProperty("data");
  });

  it("GET /trpc/cleanleaf.dashboard responds with 200 OK JSON via direct route", async () => {
    const res = await request(app).get("/trpc/cleanleaf.dashboard");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toHaveProperty("result");
  });
});
