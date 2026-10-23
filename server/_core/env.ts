import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_ENV: z.string().optional(),
  PORT: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  VITE_SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  COPERNICUS_CLIENT_ID: z.string().optional(),
  COPERNICUS_CLIENT_SECRET: z.string().optional(),
  COPERNICUS_MODE: z.enum(["live", "synthetic"]).optional().default("synthetic"),
  COPERNICUS_STRICT_MODE: z.enum(["true", "false"]).optional().default("false"),
  COPERNICUS_TOKEN_URL: z.string().optional().default("https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"),
  BUILT_IN_FORGE_API_URL: z.string().optional(),
  BUILT_IN_FORGE_API_KEY: z.string().optional(),
  VITE_APP_ID: z.string().optional(),
});

export function checkStrictBoot(env: NodeJS.ProcessEnv = process.env): void {
  const isStrictMode = env.COPERNICUS_STRICT_MODE === "true";
  if (isStrictMode) {
    const hasClientId = Boolean(env.COPERNICUS_CLIENT_ID);
    const hasClientSecret = Boolean(env.COPERNICUS_CLIENT_SECRET);
    if (!hasClientId || !hasClientSecret) {
      throw new Error(
        "COPERNICUS_STRICT_MODE=true requiere COPERNICUS_CLIENT_ID y COPERNICUS_CLIENT_SECRET configuradas para arrancar."
      );
    }
  }
}

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("[ENV] Error de configuración de variables de entorno:", result.error.format());
    throw new Error(`Error al validar variables de entorno: ${result.error.message}`);
  }
  checkStrictBoot(process.env);
  return result.data;
}

export function isProductionEnv(): boolean {
  return process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
}

// Validar variables de entorno al cargar el módulo
export const validatedEnv = validateEnv();

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  isProduction: isProductionEnv(),
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  copernicusClientId: process.env.COPERNICUS_CLIENT_ID ?? "",
  copernicusClientSecret: process.env.COPERNICUS_CLIENT_SECRET ?? "",
  copernicusStrictMode: process.env.COPERNICUS_STRICT_MODE === "true",
  copernicusTokenUrl: process.env.COPERNICUS_TOKEN_URL ?? "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
};
