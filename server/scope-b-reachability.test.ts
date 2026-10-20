import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCopernicusProdPolicy } from "./services/copernicus-policy-service";
import { FallbackObservationProvider, SyntheticCopernicusProvider, copernicusCDSEProvider } from "./copernicus";

describe("Scope B Audit - Demo and Synthetic Data Reachability", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("evaluates COPERNICUS_PROD_POLICY=live correctly and avoids defaulting to synthetic_demo_only", () => {
    vi.stubEnv("COPERNICUS_PROD_POLICY", "live");
    expect(getCopernicusProdPolicy(process.env)).toBe("live");
  });

  it("evaluates default COPERNICUS_PROD_POLICY as synthetic_demo_only when not set", () => {
    vi.stubEnv("COPERNICUS_PROD_POLICY", "");
    expect(getCopernicusProdPolicy(process.env)).toBe("synthetic_demo_only");
  });

  it("verifies FallbackObservationProvider returns synthetic data on fallback when live provider is not configured", async () => {
    const synthetic = new SyntheticCopernicusProvider("demo");
    const fallback = new FallbackObservationProvider(copernicusCDSEProvider, synthetic);

    const fallbackResult = await fallback.query({
      predioId: "p1",
      satellite: "sentinel-2",
      variable: "ndvi",
      tier: "tier1_predio"
    });

    expect(fallbackResult.data_source).toBe("synthetic");
    expect(fallbackResult.status_code).toBe("synthetic_fallback");
  });
});
