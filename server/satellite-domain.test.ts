import { describe, expect, it } from "vitest";
import {
  getSatelitesHabilitados,
  getSatelliteConfigurationStatus,
  validarSatelitesSolicitados,
} from "@shared/satellite-catalog";
import {
  querySentinel1,
  querySentinel2,
  querySentinel3,
  resolveTier,
} from "@shared/satellite-service";
import { getTierForSuperficie, processingModeForTier } from "@shared/satellite-router";
import { validatePlanLimits } from "@shared/plan-limits";
import {
  getActiveCopernicusResources,
  getCopernicusResources,
  COPERNICUS_ENDPOINTS,
  formatCopernicusDateTime,
  createODataSubscriptionPayload,
  validatePaginationLimit,
  normalizeEvictionDate,
  normalizeGeometry,
  buildODataProductsUrl,
  buildStacSearchUrl,
} from "@shared/copernicus-catalog";
import { buildInterpretationPrompt, interpretMeasurement } from "@shared/interpretation";
import { guidanceForNeed, satelliteGuidance } from "@shared/satellite-guidance";
import { getReport, listReports } from "@shared/report-catalog";
import { appRouter } from "./routers";

describe("catálogo satelital por vertical", () => {
  it("habilita Sentinel-2 y Sentinel-1 para agricultura, pero no Sentinel-3", () => {
    const enabled = getSatelitesHabilitados("agricultura");
    expect(enabled).toContain("sentinel-2");
    expect(enabled).toContain("sentinel-1");
    expect(enabled).not.toContain("sentinel-3");
  });

  it("habilita Sentinel-3 para acuicultura", () => {
    expect(getSatelitesHabilitados("acuicultura")).toContain("sentinel-3");
  });

  it("rechaza Sentinel-3 en agricultura y acepta la combinación agrícola", () => {
    expect(validarSatelitesSolicitados("agricultura", ["sentinel-3"])).toBe(false);
    expect(validarSatelitesSolicitados("agricultura", ["sentinel-2", "sentinel-1"])).toBe(true);
  });

  it("aplica una política fail-safe aunque el entorno intente habilitar Sentinel-3 en agricultura", () => {
    const key = "CLEANLEAF_SATELITES_HABILITADOS_AGRICULTURA";
    const previous = process.env[key];
    process.env[key] = "sentinel-3";
    try {
      expect(getSatelitesHabilitados("agricultura")).toEqual(["sentinel-2", "sentinel-1"]);
      const status = getSatelliteConfigurationStatus("agricultura");
      expect(status.valid).toBe(false);
      expect(status.warnings.join(" ")).toContain("fuera de política");
    } finally {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  });

  it("ignora valores desconocidos y conserva fuentes válidas", () => {
    const key = "CLEANLEAF_SATELITES_HABILITADOS_AGRICULTURA";
    const previous = process.env[key];
    process.env[key] = "sentinel-2, fuente-inexistente";
    try {
      expect(getSatelitesHabilitados("agricultura")).toEqual(["sentinel-2"]);
      expect(getSatelliteConfigurationStatus("agricultura").warnings.join(" ")).toContain("desconocidos");
    } finally {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  });
});

describe("contrato unificado de Sentinel", () => {
  it("devuelve NDVI válido para Sentinel-2", async () => {
    const result = await querySentinel2("las-quinas", "ndvi");
    expect(result).toMatchObject({ satelite: "sentinel-2", variable: "ndvi", unidad: "ratio" });
    expect(result.valor).toBeGreaterThanOrEqual(0);
    expect(result.valor).toBeLessThanOrEqual(1);
  });

  it("devuelve sigma0 VV válido para Sentinel-1", async () => {
    const result = await querySentinel1("las-quinas", "sigma0_vv");
    expect(result).toMatchObject({ satelite: "sentinel-1", variable: "sigma0_vv", unidad: "dB" });
    expect(result.valor).toBeGreaterThanOrEqual(-25);
    expect(result.valor).toBeLessThanOrEqual(-5);
  });

  it("devuelve SST válido para Sentinel-3", async () => {
    const result = await querySentinel3("centro-acuicola", "sst");
    expect(result).toMatchObject({ satelite: "sentinel-3", variable: "sst", unidad: "°C" });
    expect(result.valor).toBeGreaterThanOrEqual(0);
    expect(result.valor).toBeLessThanOrEqual(30);
  });

  it("resuelve el tier de tamaño de forma independiente", () => {
    expect(resolveTier(42)).toBe("tier1_predio");
    expect(resolveTier(50)).toBe("tier1_predio");
    expect(resolveTier(50.01)).toBe("tier2_extendido");
    expect(resolveTier(5000)).toBe("tier2_extendido");
    expect(resolveTier(5000.01)).toBe("tier3_regional");
  });
});

describe("creación de solicitud", () => {
  it("bloquea Sentinel-3 para un tenant agrícola", async () => {
    const caller = appRouter.createCaller({} as never);
    await expect(
      caller.cleanleaf.createAnalysis({
        predioId: "el-aromo",
        predioNombre: "El Aromo",
        hectareas: 31,
        vertical: "agricultura",
        satellites: ["sentinel-3"],
      }),
    ).rejects.toThrow("no está habilitado para la vertical agricultura");
  });

  it("acepta Sentinel-3 para un tenant acuícola", async () => {
    const caller = appRouter.createCaller({} as never);
    const result = await caller.cleanleaf.createAnalysis({
      predioId: "centro-acuicola",
      predioNombre: "Centro acuícola", 
      hectareas: 250,
      vertical: "acuicultura",
      satellites: ["sentinel-3"],
      planId: "regional_pyme",
    });
    expect(result).toMatchObject({ estado: "completado", tier: "tier2_extendido" });
    expect(result.medicionPreview.satelite).toBe("sentinel-3");
    expect(result.informe.estado).toBe("completado");
    expect(result.history).toEqual(["pendiente", "en_cola", "procesando", "completado"]);
  });

  it("rechaza combinaciones de satélite y variable incompatibles", async () => {
    const caller = appRouter.createCaller({} as never);
    await expect(caller.cleanleaf.createAnalysis({
      predioId: "el-aromo",
      predioNombre: "El Aromo",
      hectareas: 31,
      vertical: "agricultura",
      satellites: ["sentinel-2"],
      variables: ["sst"],
    })).rejects.toThrow("INVALID_SATELLITE_VARIABLE");
  });

  it("repite una solicitud sin duplicar el resultado por idempotencyKey", async () => {
    const caller = appRouter.createCaller({} as never);
    const input = {
      predioId: "las-quinas",
      predioNombre: "Las Quinas",
      hectareas: 42,
      vertical: "agricultura" as const,
      satellites: ["sentinel-2"] as const,
      idempotencyKey: "idempotency-las-quinas-01",
    };
    const first = await caller.cleanleaf.createAnalysis(input);
    const second = await caller.cleanleaf.createAnalysis(input);
    expect(second).toEqual(first);
  });
});

describe("enrutamiento y límites de plan v7", () => {
  it("mantiene los límites inclusivos y asigna un motor por tier", () => {
    expect(getTierForSuperficie(0.5)).toBe("tier1_predio");
    expect(getTierForSuperficie(50)).toBe("tier1_predio");
    expect(getTierForSuperficie(50.01)).toBe("tier2_extendido");
    expect(getTierForSuperficie(5000)).toBe("tier2_extendido");
    expect(getTierForSuperficie(5000.01)).toBe("tier3_regional");
    expect(processingModeForTier("tier3_regional")).toBe("batch_api");
  });

  it("rechaza tier regional a un plan sin permiso", () => {
    const result = validatePlanLimits("regional_pyme", "tier3_regional", 6000, { haMesUsadas: 0, prediosActivos: 1 });
    expect(result).toMatchObject({ allowed: false, code: "TIER3_NOT_ALLOWED" });
  });

  it("rechaza exceso mensual incluso si el tier es permitido", () => {
    const result = validatePlanLimits("piloto", "tier1_predio", 20, { haMesUsadas: 40, prediosActivos: 1 });
    expect(result).toMatchObject({ allowed: false, code: "MONTHLY_HA_LIMIT" });
  });
});

describe("agente de interpretación", () => {
  it("distingue NDVI óptico de humedad radar", () => {
    expect(interpretMeasurement({ satelite: "sentinel-2", variable: "ndvi", valor: 0.3, unidad: "ratio" })).toContain("riego");
    expect(interpretMeasurement({ satelite: "sentinel-1", variable: "sigma0_vv", valor: -18, unidad: "dB" })).toContain("humedad");
  });

  it("incluye satélite y variable en el prompt para Dify", () => {
    const prompt = buildInterpretationPrompt({ satelite: "sentinel-1", variable: "sigma0_vv", valor: -18, unidad: "dB" });
    expect(prompt).toContain("sentinel-1");
    expect(prompt).toContain("sigma0_vv");
  });
});

describe("API v1 multi-plataforma", () => {
  it("devuelve un envelope JSON estable para health y onboarding", async () => {
    const caller = appRouter.createCaller({} as never);
    await expect(caller.apiV1.health()).resolves.toMatchObject({ data: { api: "v1", status: "ok" }, error: null });
    await expect(caller.apiV1.onboarding.createTenant({ organizationName: "Campo Demo", planId: "piloto" })).resolves.toMatchObject({ data: { estado: "trial", planId: "piloto" }, error: null });
  });

  it("rechaza tier regional por plan antes de crear la solicitud", async () => {
    const caller = appRouter.createCaller({} as never);
    const response = await caller.apiV1.solicitudes.create({
      predioId: "region-araucania",
      predioNombre: "Región Araucanía",
      hectareas: 5000.01,
      vertical: "agricultura",
      satellites: ["sentinel-2"],
      planId: "regional_pyme",
      haMesUsadas: 0,
      prediosActivos: 1,
    });
    expect(response.data).toBeNull();
    expect(response.error?.code).toBe("REQUEST_REJECTED");
    expect(response.error?.message).toContain("TIER3_NOT_ALLOWED");
  });
});

describe("catálogo Copernicus multi-sector y adaptadores de API CDSE", () => {
  it("mantiene CDSE Statistical como fuente MVP para agricultura y deja CMEMS fuera", () => {
    const resources = getCopernicusResources("agricultura");
    expect(resources.map(resource => resource.id)).toContain("cdse-statistical");
    expect(resources.map(resource => resource.id)).not.toContain("cmems");
    expect(getActiveCopernicusResources("agricultura").every(resource => resource.enabled)).toBe(true);
  });

  it("ofrece recursos marinos para acuicultura sin activarlos por accidente", () => {
    const resources = getCopernicusResources("acuicultura");
    expect(resources.map(resource => resource.id)).toContain("cmems");
    expect(resources.find(resource => resource.id === "cmems")?.enabled).toBe(false);
  });

  it("configura la URL canonical de STAC v1 https://stac.dataspace.copernicus.eu/v1/", () => {
    expect(COPERNICUS_ENDPOINTS.STAC_V1).toBe("https://stac.dataspace.copernicus.eu/v1/");
    const cdseRes = getCopernicusResources("agricultura").find(r => r.id === "cdse-statistical");
    expect(cdseRes?.stacEndpoint).toBe("https://stac.dataspace.copernicus.eu/v1/");
    expect(cdseRes?.odataEndpoint).toBe("https://catalogue.dataspace.copernicus.eu/odata/v1/");
  });

  it("formatea DateTimeOffset en ISO 8601 UTC con sufijo 'Z' y 6 dígitos de precisión", () => {
    const formatted = formatCopernicusDateTime("2024-06-04T12:03:49.113620+00:00");
    expect(formatted).toBe("2024-06-04T12:03:49.113620Z");
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/);
  });

  it("requiere SubscriptionType obligatorio en minúsculas ('pull' o 'push')", () => {
    const payload = createODataSubscriptionPayload({
      FilterParam: "Collection/Name eq 'SENTINEL-1'",
      SubscriptionType: "pull",
    });
    expect(payload.SubscriptionType).toBe("pull");
    expect(payload.StageOrder).toBe(true);
    expect(payload.Status).toBe("running");

    expect(() =>
      createODataSubscriptionPayload({
        FilterParam: "Collection/Name eq 'SENTINEL-1'",
        SubscriptionType: "INVALID" as never,
      }),
    ).toThrow("Invalid SubscriptionType");
  });

  it("aplica el límite de paginación de 10,000 elementos en OData y STAC", () => {
    const validPaging = validatePaginationLimit(9900, 20);
    expect(validPaging.valid).toBe(true);
    expect(validPaging.exceeded).toBe(false);

    const exceededPaging = validatePaginationLimit(10001, 20);
    expect(exceededPaging.valid).toBe(false);
    expect(exceededPaging.exceeded).toBe(true);
    expect(exceededPaging.warning).toContain("exceeds maximum Copernicus Catalog API limit");

    const { pagination } = buildODataProductsUrl({ skip: 10005 });
    expect(pagination.exceeded).toBe(true);

    const stacRes = buildStacSearchUrl({ page: 600, limit: 20 });
    expect(stacRes.url).toContain("stac.dataspace.copernicus.eu/v1/search");
    expect(stacRes.pagination.exceeded).toBe(true);
  });

  it("normaliza EvictionDate a '9999-12-31T23:59:59.999Z' cuando es nulo o vacío", () => {
    expect(normalizeEvictionDate("")).toBe("9999-12-31T23:59:59.999Z");
    expect(normalizeEvictionDate(null)).toBe("9999-12-31T23:59:59.999Z");
    expect(normalizeEvictionDate("2025-12-31T00:00:00Z")).toBe("2025-12-31T00:00:00Z");
  });

  it("normaliza geometrías vacías a null", () => {
    expect(normalizeGeometry([])).toBeNull();
    expect(normalizeGeometry(null)).toBeNull();
    expect(normalizeGeometry({ type: "Polygon", coordinates: [] })).toEqual({ type: "Polygon", coordinates: [] });
  });
});

describe("máquina de estados", () => {
  it("rechaza transiciones inválidas y acepta el camino completo", async () => {
    const { assertTransition } = await import("@shared/analysis-state");
    expect(() => assertTransition("completado", "procesando")).toThrow("INVALID_STATE_TRANSITION");
    expect(() => assertTransition("procesando", "completado")).not.toThrow();
  });
});

describe("guía de elección satelital", () => {
  it("recomienda Sentinel-2 para vigor y Sentinel-1 como respaldo con nubosidad", () => {
    expect(guidanceForNeed("vigor").recommendations).toEqual(["sentinel-2"]);
    expect(guidanceForNeed("nubosidad").recommendations).toEqual(["sentinel-2", "sentinel-1"]);
    expect(satelliteGuidance["sentinel-1"].limitations.join(" ")).toContain("interpretación");
  });

  it("mantiene Sentinel-3 como orientación de fase 2 para acuicultura", () => {
    expect(guidanceForNeed("acuicultura").recommendations).toContain("sentinel-3");
    expect(satelliteGuidance["sentinel-3"].phase).toBe("fase_2");
  });
});

describe("dashboard de informes", () => {
  it("filtra por estado y conserva trazabilidad hasta informe listo", () => {
    const ready = listReports({ status: "completado" });
    expect(ready.length).toBeGreaterThan(0);
    expect(ready.every(report => report.progress === 100 && report.trace.at(-1)?.status === "completado")).toBe(true);
  });

  it("expone estados no terminados sin prometer descarga", () => {
    const report = getReport("inf-el-aromo-error");
    expect(report?.status).toBe("error_reintentable");
    expect(report?.progress).toBeLessThan(100);
    expect(report?.trace.at(-1)?.message).toContain("Fallo");
  });
});
