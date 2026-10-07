import { describe, expect, it } from "vitest";
import { processCopernicusAnalysis, S2_MULTI_INDEX_EVALSCRIPT } from "./services/copernicus-orchestrator";

describe("Copernicus Analysis Orchestrator", () => {
  it("includes B04, B05, B08, B8A, B11, and SCL cloud masking in evalscript", () => {
    expect(S2_MULTI_INDEX_EVALSCRIPT).toContain("B04");
    expect(S2_MULTI_INDEX_EVALSCRIPT).toContain("B05");
    expect(S2_MULTI_INDEX_EVALSCRIPT).toContain("B08");
    expect(S2_MULTI_INDEX_EVALSCRIPT).toContain("B8A");
    expect(S2_MULTI_INDEX_EVALSCRIPT).toContain("B11");
    expect(S2_MULTI_INDEX_EVALSCRIPT).toContain("SCL");
    expect(S2_MULTI_INDEX_EVALSCRIPT).toContain("ndvi");
    expect(S2_MULTI_INDEX_EVALSCRIPT).toContain("ndre");
    expect(S2_MULTI_INDEX_EVALSCRIPT).toContain("lswi");
  });

  it("returns fallback synthetic analysis with transparent provenance when credentials are missing", async () => {
    const result = await processCopernicusAnalysis({
      predioId: "predio-test-1",
      coordinates: [
        [
          [-72.6, -38.7],
          [-72.6, -38.8],
          [-72.5, -38.8],
          [-72.5, -38.7],
          [-72.6, -38.7],
        ],
      ],
      dateFrom: "2026-09-01T00:00:00Z",
      dateTo: "2026-09-30T23:59:59Z",
    });

    expect(result.predioId).toBe("predio-test-1");
    expect(result.status).toBe("FALLBACK_SYNTHETIC");
    expect(result.provenance.data_source).toBe("synthetic");
    expect(result.indices.length).toBeGreaterThanOrEqual(1);
    expect(result.indices.map(i => i.variable)).toContain("ndvi");
  });
});
