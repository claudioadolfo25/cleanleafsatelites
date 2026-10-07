import axios from "axios";

export type CopernicusTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getCopernicusAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const clientId = process.env.COPERNICUS_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("COPERNICUS_CREDENTIALS_MISSING: COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET are required.");
  }

  const tokenUrl = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  try {
    const response = await axios.post<CopernicusTokenResponse>(tokenUrl, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    });

    cachedToken = response.data.access_token;
    tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
    return cachedToken;
  } catch (error: any) {
    throw new Error(`COPERNICUS_AUTH_ERROR: Failed to authenticate with CDSE: ${error?.message || error}`);
  }
}
