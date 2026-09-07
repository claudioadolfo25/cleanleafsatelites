import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("Flujos Críticos — E2E / Integración (Nuevo Análisis -> Informe)", () => {
  const caller = appRouter.createCaller({} as never);

  it("flujo completo Tier 1: crea análisis, transita a completado y genera informe base", async () => {
    const response = await caller.cleanleaf.createAnalysis({
      predioId: "las-quinas-e2e",
      predioNombre: "Las Quinas E2E",
      hectareas: 42,
      vertical: "agricultura",
      satellites: ["sentinel-2"],
      variables: ["ndvi"],
      idempotencyKey: `e2e-tier1-${Date.now()}`,
    });

    expect(response.estado).toBe("completado");
    expect(response.tier).toBe("tier1_predio");
    expect(response.history).toEqual(["pendiente", "en_cola", "procesando", "completado"]);
    expect(response.medicionPreview).toBeDefined();
    expect(response.medicionPreview.valor).toBeGreaterThanOrEqual(0);
    expect(response.informe).toBeDefined();
    expect(response.informe.estado).toBe("completado");
    expect(response.informe.hallazgos.length).toBeGreaterThan(0);
    expect(response.informe.recomendaciones.length).toBeGreaterThan(0);
  });

  it("flujo completo Tier 2: procesa zona extendida con motor statistical_api e informe base", async () => {
    const response = await caller.cleanleaf.createAnalysis({
      predioId: "fundo-chufquen-e2e",
      predioNombre: "Fundo Chufquén E2E",
      hectareas: 250,
      vertical: "agricultura",
      satellites: ["sentinel-2", "sentinel-1"],
      variables: ["ndvi", "sigma0_vv"],
      planId: "regional_pyme",
      idempotencyKey: `e2e-tier2-${Date.now()}`,
    });

    expect(response.estado).toBe("completado");
    expect(response.tier).toBe("tier2_extendido");
    expect(response.motorUsado).toBe("statistical_api");
    expect(response.history).toEqual(["pendiente", "en_cola", "procesando", "completado"]);
    expect(response.informe).toBeDefined();
    expect(response.informe.estado).toBe("completado");
  });

  it("flujo Tier 3: asigna requiere_revision sin procesar ni consumir cuota automáticamente", async () => {
    const response = await caller.cleanleaf.createAnalysis({
      predioId: "valle-imperial-e2e",
      predioNombre: "Valle Imperial E2E",
      hectareas: 6000,
      vertical: "agricultura",
      satellites: ["sentinel-2"],
      variables: ["ndvi"],
      planId: "region_completa",
      idempotencyKey: `e2e-tier3-${Date.now()}`,
    });

    expect(response.estado).toBe("requiere_revision");
    expect(response.tier).toBe("tier3_regional");
    expect(response.motorUsado).toBe("batch_api");
    expect(response.history).toEqual(["pendiente", "requiere_revision"]);
    expect((response as unknown as { medicionPreview?: unknown }).medicionPreview).toBeUndefined();
    expect((response as unknown as { informe?: unknown }).informe).toBeUndefined();
    expect(response.mensaje).toContain("requiere evaluación");
  });

  it("garantiza idempotencia estricta en reintentos con la misma idempotencyKey", async () => {
    const idempotencyKey = `e2e-idempotent-${Date.now()}`;
    const payload = {
      predioId: "predio-idempotente",
      predioNombre: "Predio Idempotente",
      hectareas: 35,
      vertical: "agricultura" as const,
      satellites: ["sentinel-2"] as const,
      variables: ["ndvi"],
      idempotencyKey,
    };

    const firstRun = await caller.cleanleaf.createAnalysis(payload);
    const secondRun = await caller.cleanleaf.createAnalysis(payload);

    expect(firstRun.id).toBe(secondRun.id);
    expect(firstRun.correlationId).toBe(secondRun.correlationId);
    expect(firstRun).toEqual(secondRun);
  });
});
