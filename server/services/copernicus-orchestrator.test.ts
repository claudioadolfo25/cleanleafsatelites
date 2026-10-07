import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeNdviAnalysis, AnalysisRequestParams } from "./copernicus-orchestrator";
import * as authModule from "./copernicus-auth";
import axios from "axios";

vi.mock("axios");
vi.mock("../admin/supabase-client", () => {
  return {
    supabaseAdmin: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "test-uuid-123" }, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    },
  };
});

describe("CopernicusOrchestrator Unit Tests", () => {
  const baseParams: AnalysisRequestParams = {
    predioId: "predio-uuid-111",
    tenantId: "tenant-uuid-222",
    superficieHa: 12.5,
    fromDate: "2026-09-01",
    toDate: "2026-09-25",
    bbox: [-70.64827, -33.45694, -70.64102, -33.45123],
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [-70.64827, -33.45694],
          [-70.64102, -33.45694],
          [-70.64102, -33.45123],
          [-70.64827, -33.45123],
          [-70.64827, -33.45694],
        ],
      ],
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(authModule, "getCopernicusAccessToken").mockResolvedValue("mock-valid-jwt-token");
  });

  it("returns NO_DATA when Catalog API finds zero satellite scenes", async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        features: [],
      },
    });

    const result = await executeNdviAnalysis(baseParams);
    expect(result.status).toBe("NO_DATA");
    expect(result.message).toContain("No satellite imagery available");
  });

  it("returns RATE_LIMITED when Catalog API responds with HTTP 429", async () => {
    vi.mocked(axios.post).mockRejectedValueOnce({
      response: {
        status: 429,
        data: { error: { message: "Too Many Requests" } },
      },
    });

    const result = await executeNdviAnalysis(baseParams);
    expect(result.status).toBe("RATE_LIMITED");
    expect(result.message).toContain("rate limit exceeded");
  });

  it("executes full 3-step pipeline and returns SUCCESS with high validRatio", async () => {
    // 1. Catalog API Mock Response
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        features: [{ id: "S2_SCENE_001" }],
      },
    });

    // 2. Statistical API Mock Response
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        data: [
          {
            outputs: {
              ndvi: {
                bands: {
                  B0: {
                    stats: {
                      mean: 0.6543,
                      min: 0.1234,
                      max: 0.8912,
                      stDev: 0.0543,
                      sampleCount: 2500,
                      noDataCount: 0,
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    const result = await executeNdviAnalysis(baseParams);
    expect(result.status).toBe("SUCCESS");
    expect(result.stats).toBeDefined();
    expect(result.stats?.mean).toBe(0.6543);
    expect(result.stats?.validPixelRatio).toBe(1.0);
  });

  it("returns LOW_CONFIDENCE when validPixelRatio < minValidPixelRatio (e.g. 705/2500 = 28.2% valid pixels)", async () => {
    // 1. Catalog API Mock Response
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        features: [{ id: "S2_SCENE_PARTIAL_CLOUD" }],
      },
    });

    // 2. Statistical API Mock Response with high noDataCount
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        data: [
          {
            outputs: {
              ndvi: {
                bands: {
                  B0: {
                    stats: {
                      mean: 0.3674,
                      min: -0.0264,
                      max: 0.8567,
                      stDev: 0.2543,
                      sampleCount: 2500,
                      noDataCount: 1800, // validPixels = 700 / 2500 = 0.28 < 0.30
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    const result = await executeNdviAnalysis(baseParams);
    expect(result.status).toBe("LOW_CONFIDENCE");
    expect(result.stats?.validPixelRatio).toBe(0.28);
    expect(result.message).toContain("Low confidence result");
  });

  it("persists negative mean NDVI (e.g. water/bare soil = -0.1544) as SUCCESS when validPixelRatio is high", async () => {
    // 1. Catalog API Mock Response
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        features: [{ id: "S2_SCENE_WATER_BODY" }],
      },
    });

    // 2. Statistical API Mock Response with negative mean
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        data: [
          {
            outputs: {
              ndvi: {
                bands: {
                  B0: {
                    stats: {
                      mean: -0.1544,
                      min: -0.4500,
                      max: 0.0500,
                      stDev: 0.0812,
                      sampleCount: 2500,
                      noDataCount: 50, // validPixels = 2450 / 2500 = 0.98 >= 0.30
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    const result = await executeNdviAnalysis(baseParams);
    expect(result.status).toBe("SUCCESS");
    expect(result.stats?.mean).toBe(-0.1544);
    expect(result.stats?.validPixelRatio).toBe(0.98);
  });
});
