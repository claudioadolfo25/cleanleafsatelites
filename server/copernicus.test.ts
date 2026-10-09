import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { CopernicusTokenManager, CopernicusCDSEProvider, CopernicusUnavailableError } from "./copernicus";

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
});
