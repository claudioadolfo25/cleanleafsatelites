import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCopernicusAccessToken, invalidateCopernicusToken } from "./copernicus-auth";
import axios from "axios";

vi.mock("axios");

describe("CopernicusAuth Unit Tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invalidateCopernicusToken();
    process.env.COPERNICUS_CLIENT_ID = "test-client-id";
    process.env.COPERNICUS_CLIENT_SECRET = "test-client-secret";
  });

  it("fetches a new access token successfully and caches it", async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        access_token: "mock-access-token-123",
        expires_in: 3600,
        token_type: "Bearer",
      },
    });

    const token1 = await getCopernicusAccessToken();
    expect(token1).toBe("mock-access-token-123");
    expect(axios.post).toHaveBeenCalledTimes(1);

    // Second call should return cached token without calling axios
    const token2 = await getCopernicusAccessToken();
    expect(token2).toBe("mock-access-token-123");
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it("invalidates token and re-fetches when requested", async () => {
    vi.mocked(axios.post)
      .mockResolvedValueOnce({
        data: { access_token: "token-1", expires_in: 3600, token_type: "Bearer" },
      })
      .mockResolvedValueOnce({
        data: { access_token: "token-2", expires_in: 3600, token_type: "Bearer" },
      });

    const token1 = await getCopernicusAccessToken();
    expect(token1).toBe("token-1");

    invalidateCopernicusToken();

    const token2 = await getCopernicusAccessToken();
    expect(token2).toBe("token-2");
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  it("throws explicit error when credentials are missing", async () => {
    delete process.env.COPERNICUS_CLIENT_ID;
    delete process.env.SENTINELHUB_CLIENT_ID;
    delete process.env.COPERNICUS_CLIENT_SECRET;
    delete process.env.SENTINELHUB_CLIENT_SECRET;

    await expect(getCopernicusAccessToken()).rejects.toThrow(
      "[CopernicusAuth] Missing COPERNICUS_CLIENT_ID or COPERNICUS_CLIENT_SECRET"
    );
  });
});
