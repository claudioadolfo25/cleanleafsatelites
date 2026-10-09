export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  copernicusClientId: process.env.COPERNICUS_CLIENT_ID ?? "sh-79ab7ae6-ca8d-4823-90d1-fca2c30fe535",
  copernicusClientSecret: process.env.COPERNICUS_CLIENT_SECRET ?? "",
  copernicusTokenUrl: process.env.COPERNICUS_TOKEN_URL ?? "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
};
