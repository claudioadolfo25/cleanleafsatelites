import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  requests: [] as any[],
  reports: [] as any[],
};

class Query {
  table: string;
  operation: "select" | "insert" | "update" = "select";
  payload: any;
  filters: Record<string, unknown> = {};
  constructor(table: string) { this.table = table; }
  select() { this.operation = this.operation === "insert" ? "insert" : "select"; return this; }
  insert(payload: any) { this.operation = "insert"; this.payload = payload; return this; }
  update(payload: any) { this.operation = "update"; this.payload = payload; return this; }
  eq(field: string, value: unknown) { this.filters[field] = value; return this; }
  order() { return this; }
  maybeSingle() { return Promise.resolve(this.resolve(true)); }
  single() { return Promise.resolve(this.resolve(true)); }
  then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) { return Promise.resolve(this.resolve(false)).then(resolve, reject); }
  resolve(single: boolean) {
    const rows = this.table === "solicitudes_analisis" ? state.requests : state.reports;
    if (this.operation === "insert") {
      const row = { ...this.payload, id: `${this.table}-1`, creado_en: new Date().toISOString() };
      rows.push(row);
      return { data: row, error: null };
    }
    if (this.operation === "update") {
      const row = rows.find(item => Object.entries(this.filters).every(([key, value]) => item[key] === value));
      if (row) Object.assign(row, this.payload);
      return { data: row ?? null, error: null };
    }
    const filtered = rows.filter(item => Object.entries(this.filters).every(([key, value]) => item[key] === value));
    return { data: single ? (filtered[0] ?? null) : filtered, error: null };
  }
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: (table: string) => new Query(table) }),
}));

import { getPersistedReport, getSupabasePersistenceClient, persistAnalysis, resetSupabasePersistenceForTests } from "./supabase-persistence";

const identity = { userId: "00000000-0000-0000-0000-000000000001", tenantId: "00000000-0000-0000-0000-000000000010", email: "qa@example.com" };
const report = {
  id: "report-sol-1", estado: "completado", predioId: "predio-1", predioNombre: "Predio QA", tier: "tier1_predio",
  periodo: { desde: "2026-01-01T00:00:00.000Z", hasta: "2026-01-02T00:00:00.000Z" },
  fuentes: [{ satelite: "sentinel-2", variable: "ndvi", unidad: "ratio" }], resumen: "Vigor estable", hallazgos: [{ tipo: "lectura_actual", severidad: "baja", fuente: "sentinel-2", variable: "ndvi", valor_actual: 0.7 }], recomendaciones: ["Validar en terreno"], limitaciones: ["synthetic"], mediciones: [], generado_en: "2026-01-02T00:00:00.000Z",
} as any;

describe("Supabase persistence for analysis reports", () => {
  beforeEach(() => {
    state.requests.length = 0;
    state.reports.length = 0;
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-key";
    resetSupabasePersistenceForTests();
  });

  it("persiste solicitud, informe y enlace con tenant filtrado", async () => {
    const persisted = await persistAnalysis({
      identity,
      request: { predioId: "predio-1", predioNombre: "Predio QA", hectareas: 10, tier: "tier1_predio", satellites: ["sentinel-2"], variables: ["ndvi"], estado: "completado", motorUsado: "processing_api", correlationId: "corr-qa-123456", idempotencyKey: "idem-qa-123456" },
      report,
      source: "synthetic",
    });
    expect(persisted?.report.dataSource).toBe("synthetic");
    expect(state.requests[0].resultado_informe_id).toBe("informes-1");
    expect(state.reports[0].tenant_id).toBe(identity.tenantId);
  });

  it("lee solo el informe del tenant solicitado", async () => {
    state.reports.push({ id: "informes-1", tenant_id: identity.tenantId, fecha_generacion: "2026-01-02T00:00:00.000Z", contenido: { report, status: "completado", source: "synthetic" } });
    state.reports.push({ id: "informes-2", tenant_id: "tenant-other", fecha_generacion: "2026-01-02T00:00:00.000Z", contenido: { report, status: "completado", source: "synthetic" } });
    const found = await getPersistedReport(identity, "informes-1");
    expect(found?.id).toBe("informes-1");
    const other = await getPersistedReport(identity, "informes-2");
    expect(other).toBeNull();
    expect(getSupabasePersistenceClient()).not.toBeNull();
  });
});
