import axios from "axios";

export interface CopernicusTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Retrieves a valid Copernicus Data Space Ecosystem (CDSE) OAuth2 Access Token.
 * Implements proactive token caching and automatic refresh prior to expiration.
 */
export async function getCopernicusAccessToken(): Promise<string> {
  const now = Date.now();
  // Refresh if token is missing or expires in less than 60 seconds
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const clientId = process.env.COPERNICUS_CLIENT_ID || process.env.SENTINELHUB_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET || process.env.SENTINELHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "[CopernicusAuth] Missing COPERNICUS_CLIENT_ID or COPERNICUS_CLIENT_SECRET environment variables."
    );
  }

  const tokenUrl = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  try {
    const response = await axios.post<CopernicusTokenResponse>(tokenUrl, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    });

    cachedToken = response.data.access_token;
    // expires_in is in seconds
    tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
    return cachedToken;
  } catch (error: any) {
    console.error("[CopernicusAuth] OAuth2 token request failed:", error?.response?.data || error?.message);
    throw new Error(`[CopernicusAuth] Token fetch failed: ${error?.response?.data?.error_description || error?.message}`);
  }
}

/**
 * Resets the cached token explicitly (e.g., when receiving an unexpected 401 mid-stream).
 */
export function invalidateCopernicusToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}
