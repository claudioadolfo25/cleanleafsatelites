import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CopernicusTokenManager, CopernicusCDSEProvider, CopernicusUnavailableError, FallbackObservationProvider, SyntheticCopernicusProvider, isCopernicusLiveEnabled, buildStatisticalPayload } from "./copernicus";

describe("Copernicus OAuth2 Client Service (Tellus)", () => {
  const DEFAULT_CLIENT_ID = "sh-79ab7ae6-ca8d-4823-90d1-fca2c30fe535";
  const TEST_SECRET = "test-secret-key-12345";
  const TEST_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with official Tellus client ID as default", () => {
    const manager = new CopernicusTokenManager(DEFAULT_CLIENT_ID, "", TEST_TOKEN_URL);
    expect(manager.getClientId()).toBe(DEFAULT_CLIENT_ID);
    expect(manager.isConfigured()).toBe(false);
  });

  it("recognizes when credentials are configured", () => {
    const manager = new CopernicusTokenManager(DEFAULT_CLIENT_ID, TEST_SECRET, TEST_TOKEN_URL);
    expect(manager.isConfigured()).toBe(true);
  });

  it("fetches access token via OAuth2 client_credentials grant and caches it", async () => {
    const manager = new CopernicusTokenManager(DEFAULT_CLIENT_ID, TEST_SECRET, TEST_TOKEN_URL);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "mock-jwt-access-token-xyz",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    });

    vi.stubGlobal("fetch", mockFetch);

    const token = await manager.fetchAccessToken();

    expect(token.accessToken).toBe("mock-jwt-access-token-xyz");
    expect(token.tokenType).toBe("Bearer");
    expect(token.expiresAt).toBeGreaterThan(Date.now());
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Calling again should return cached token without making another HTTP request
    const cachedToken = await manager.fetchAccessToken();
    expect(cachedToken.accessToken).toBe("mock-jwt-access-token-xyz");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("fails explicitly when client secret is missing", async () => {
    const manager = new CopernicusTokenManager(DEFAULT_CLIENT_ID, "", TEST_TOKEN_URL);
    const provider = new CopernicusCDSEProvider(manager);

    await expect(provider.query({
      predioId: "predio-1",
      satellite: "sentinel-2",
      variable: "ndvi",
      tier: "tier1_predial",
    })).rejects.toBeInstanceOf(CopernicusUnavailableError);
  });

  it("propagates a token/network failure instead of returning mock data", async () => {
    const manager = new CopernicusTokenManager(DEFAULT_CLIENT_ID, TEST_SECRET, TEST_TOKEN_URL);
    const provider = new CopernicusCDSEProvider(manager);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network connection error"))
    );

    await expect(provider.query({
      predioId: "predio-1",
      satellite: "sentinel-2",
      variable: "ndvi",
      tier: "tier1_predial",
    })).rejects.toThrow("Network connection error");
  });

  it("activa live únicamente en staging con modo live y ambas credenciales", () => {
    const manager = new CopernicusTokenManager(DEFAULT_CLIENT_ID, TEST_SECRET, TEST_TOKEN_URL);
    expect(isCopernicusLiveEnabled({ APP_ENV: "staging", COPERNICUS_MODE: "live" }, manager)).toBe(true);
    expect(isCopernicusLiveEnabled({ APP_ENV: "production", COPERNICUS_MODE: "live" }, manager)).toBe(false);
    expect(isCopernicusLiveEnabled({ APP_ENV: "staging", COPERNICUS_MODE: "synthetic" }, manager)).toBe(false);
    expect(isCopernicusLiveEnabled({ APP_ENV: "staging", COPERNICUS_MODE: "live" }, new CopernicusTokenManager(DEFAULT_CLIENT_ID, "", TEST_TOKEN_URL))).toBe(false);
  });

  it("consulta CDSE real con mocks y etiqueta la respuesta con trazabilidad", async () => {
    const manager = new CopernicusTokenManager(DEFAULT_CLIENT_ID, TEST_SECRET, TEST_TOKEN_URL);
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: "mock-token", expires_in: 3600, token_type: "Bearer" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [{ outputs: { default: { bands: { B0: { stats: { mean: 0.73456 } } } } } }] }) });
    vi.stubGlobal("fetch", mockFetch);
    const result = await new CopernicusCDSEProvider(manager).query({ predioId: "predio-1", satellite: "sentinel-2", variable: "ndvi", tier: "tier1_predial" });
    expect(result).toMatchObject({ data_source: "copernicus_cdse", valor: 0.7346, status_code: "200", traceability: { status: "success", data_source: "copernicus_cdse", product: "sentinel-2-l2a" } });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("rechaza una respuesta inválida de CDSE en lugar de inventar un valor", async () => {
    const manager = new CopernicusTokenManager(DEFAULT_CLIENT_ID, TEST_SECRET, TEST_TOKEN_URL);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: "mock-token", expires_in: 3600, token_type: "Bearer" }) })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) }));
    const result = await new FallbackObservationProvider(new CopernicusCDSEProvider(manager), new SyntheticCopernicusProvider("Respuesta inválida de CDSE")).query({ predioId: "predio-1", satellite: "sentinel-2", variable: "ndvi", tier: "tier1_predial" });
    expect(result.data_source).toBe("synthetic");
    expect(result.traceability).toMatchObject({ status: "fallback", data_source: "synthetic" });
  });

  it("usa fallback sintético determinista cuando faltan credenciales", async () => {
    const result = await new SyntheticCopernicusProvider("Credenciales CDSE ausentes").query({ predioId: "predio-1", satellite: "sentinel-2", variable: "ndvi", tier: "tier1_predial" });
    expect(result.data_source).toBe("synthetic");
    expect(result.status_code).toBe("synthetic_fallback");
    expect(result.traceability).toMatchObject({ status: "fallback", data_source: "synthetic", error: "Credenciales CDSE ausentes" });
  });

  it("degrada un error CDSE a un resultado sintético explícitamente etiquetado", async () => {
    const liveProvider = { query: vi.fn().mockRejectedValue(new Error("CDSE no disponible")) };
    const result = await new FallbackObservationProvider(liveProvider, new SyntheticCopernicusProvider("CDSE no disponible")).query({ predioId: "predio-1", satellite: "sentinel-2", variable: "ndvi", tier: "tier1_predial" });
    expect(result.data_source).toBe("synthetic");
    expect(result.traceability).toMatchObject({ status: "fallback", data_source: "synthetic", error: "CDSE no disponible" });
    expect(result.valor).toBeGreaterThanOrEqual(0);
  });

  describe("Statistical API Payload Builder & Validation", () => {
    it("construye un payload válido con aggregationInterval.of igual a P1D", () => {
      const payload = buildStatisticalPayload({
        predioId: "predio-1",
        satellite: "sentinel-2",
        variable: "ndvi",
        tier: "tier1_predial",
        periodFrom: "2026-09-01T00:00:00Z",
        periodTo: "2026-09-15T23:59:59Z",
        bbox: [-72.6, -38.7, -72.58, -38.68],
      });

      expect(payload.aggregation.aggregationInterval).toEqual({ of: "P1D" });
      expect(payload.aggregation.aggregationInterval.of).toBeDefined();
      expect(payload.aggregation.aggregationInterval.of).not.toBeNull();
      expect(payload.input.data[0].type).toBe("sentinel-2-l2a");
      expect(payload.input.bounds.bbox).toEqual([-72.6, -38.7, -72.58, -38.68]);
    });

    it("rechaza rangos de fechas menores a 24 horas (1 día)", () => {
      expect(() => buildStatisticalPayload({
        predioId: "predio-1",
        satellite: "sentinel-2",
        variable: "ndvi",
        tier: "tier1_predial",
        periodFrom: "2026-09-01T00:00:00Z",
        periodTo: "2026-09-01T12:00:00Z",
      })).toThrow("menor al mínimo requerido de 24 horas");
    });

    it("rechaza fechas de período inválidas", () => {
      expect(() => buildStatisticalPayload({
        predioId: "predio-1",
        satellite: "sentinel-2",
        variable: "ndvi",
        tier: "tier1_predial",
        periodFrom: "invalid-date",
        periodTo: "2026-09-15T00:00:00Z",
      })).toThrow("Fechas de período inválidas");
    });

    it("envía el payload corregido en la llamada HTTP a CDSE", async () => {
      const manager = new CopernicusTokenManager(DEFAULT_CLIENT_ID, TEST_SECRET, TEST_TOKEN_URL);
      let capturedPayload: any = null;

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: "mock-token", expires_in: 3600, token_type: "Bearer" }) })
        .mockImplementationOnce(async (_url, options) => {
          capturedPayload = JSON.parse(options.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: [{ outputs: { default: { bands: { B0: { stats: { mean: 0.8123 } } } } } }] }),
          };
        });

      vi.stubGlobal("fetch", mockFetch);

      const provider = new CopernicusCDSEProvider(manager);
      await provider.query({
        predioId: "predio-1",
        satellite: "sentinel-2",
        variable: "ndvi",
        tier: "tier1_predial",
        periodFrom: "2026-09-01T00:00:00Z",
        periodTo: "2026-09-15T23:59:59Z",
      });

      expect(capturedPayload).not.toBeNull();
      expect(capturedPayload.aggregation.aggregationInterval).toEqual({ of: "P1D" });
      expect(capturedPayload.aggregation.aggregationInterval.of).toBe("P1D");
    });
  });
});
