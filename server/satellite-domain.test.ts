import { describe, expect, it } from "vitest";
import { getSatelitesHabilitados } from "@shared/satellite-catalog";
import { getTierForSuperficie, processingModeForTier } from "@shared/satellite-router";
import { planCatalog } from "@shared/plan-limits";

describe("Satellite Catalog Domain Rules", () => {
  it("enforces agriculture sources (Sentinel-2 and Sentinel-1)", () => {
    const sources = getSatelitesHabilitados("agricultura");
    expect(sources).toContain("sentinel-2");
    expect(sources).toContain("sentinel-1");
    expect(sources).not.toContain("sentinel-3");
  });

  it("enforces aquaculture sources (Sentinel-3 and Sentinel-2)", () => {
    const sources = getSatelitesHabilitados("acuicultura");
    expect(sources).toContain("sentinel-3");
    expect(sources).toContain("sentinel-2");
  });
});

describe("Satellite Router Rules", () => {
  it("routes < 50 ha to tier1_predio and processing_api", () => {
    const tier = getTierForSuperficie(20);
    const motor = processingModeForTier(tier);
    expect(tier).toBe("tier1_predio");
    expect(motor).toBe("processing_api");
  });

  it("routes 50-5000 ha to tier2_extendido and statistical_api", () => {
    const tier = getTierForSuperficie(200);
    const motor = processingModeForTier(tier);
    expect(tier).toBe("tier2_extendido");
    expect(motor).toBe("statistical_api");
  });

  it("routes > 5000 ha to tier3_regional and batch_api", () => {
    const tier = getTierForSuperficie(6000);
    const motor = processingModeForTier(tier);
    expect(tier).toBe("tier3_regional");
    expect(motor).toBe("batch_api");
  });
});

describe("Plan Limits Rules", () => {
  it("defines standard plan quotas", () => {
    expect(planCatalog.piloto.maxHaMes).toBe(50);
    expect(planCatalog.regional_pyme.maxHaMes).toBe(5000);
    expect(planCatalog.region_completa.permiteTier3Regional).toBe(true);
  });
});
