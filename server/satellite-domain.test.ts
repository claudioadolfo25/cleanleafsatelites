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
import { buildInterpretationPrompt, interpretMeasurement } from "@shared/interpretation";
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
    expect(resolveTier(420)).toBe("tier2_extendido");
    expect(resolveTier(500)).toBe("tier3_regional");
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
    });
    expect(result).toMatchObject({ estado: "en_proceso", tier: "tier2_extendido" });
    expect(result.medicionPreview.satelite).toBe("sentinel-3");
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
