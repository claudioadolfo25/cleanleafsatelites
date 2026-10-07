import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Migración a Supabase con RLS multi-tenant", () => {
  const schemaSql = readFileSync(join(process.cwd(), "supabase", "schema.sql"), "utf-8");
  const seedSql = readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf-8");
  const rlsTestSql = readFileSync(join(process.cwd(), "supabase", "tests_rls.sql"), "utf-8");

  it("schema.sql declara políticas RLS con tenant_id para todas las tablas multi-tenant", () => {
    const requiredTables = [
      "tenants",
      "users",
      "predios",
      "suscripciones",
      "solicitudes_analisis",
      "informes",
      "mediciones",
      "consumo",
      "alertas",
      "api_keys",
      "workflow_logs",
    ];

    requiredTables.forEach(table => {
      expect(schemaSql).toContain(`alter table ${table} enable row level security;`);
    });

    expect(schemaSql).toContain("create or replace function get_current_tenant_id()");
    expect(schemaSql).toContain("get_current_tenant_id()");
  });

  it("seed.sql define datos de prueba multi-tenant para aislar Tenant A y Tenant B", () => {
    expect(seedSql).toContain("00000000-0000-0000-0000-000000000001");
    expect(seedSql).toContain("00000000-0000-0000-0000-000000000002");
    expect(seedSql).toContain("insert into predios");
    expect(seedSql).toContain("insert into solicitudes_analisis");
  });

  it("tests_rls.sql verifica el aislamiento entre Tenant A y Tenant B", () => {
    expect(rlsTestSql).toContain("set local request.jwt.claims");
    expect(rlsTestSql).toContain("00000000-0000-0000-0000-000000000001");
    expect(rlsTestSql).toContain("00000000-0000-0000-0000-000000000002");
    expect(rlsTestSql).toContain("RLS FAIL");
  });
});
