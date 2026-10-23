import express, { type Express, type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { checkStrictBoot } from "./_core/env";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

const userOrIpKey = (req: Request): string => {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string") {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.ip || "127.0.0.1";
};

// Estructura de configuración extensible para almacenamiento de Rate Limiting (Redis / Upstash / Memory)
export const rateLimitStoreDriver = process.env.RATE_LIMIT_STORE_DRIVER || "memory";
export const rateLimitDistributedConfig = {
  driver: rateLimitStoreDriver,
  redisUrl: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || null,
};

const createCustomRateLimiter = (maxRequests: number, windowMs: number) => {
  return rateLimit({
    windowMs,
    limit: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userOrIpKey,
    validate: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Demasiadas peticiones. Intenta nuevamente en un minuto.",
        },
      });
    },
  });
};

export function createApp(): Express {
  const app = express();

  // Trust Render reverse proxy for x-forwarded-proto and client IP
  app.set("trust proxy", 1);

  // Use Helmet for standard security headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  // Stricter rate limiting for auth and analysis creation
  app.use("/api/trpc/auth*", createCustomRateLimiter(15, 60 * 1000));
  app.use("/api/trpc/cleanleaf.createAnalysis", createCustomRateLimiter(10, 60 * 1000));

  // General rate limiting for API
  app.use("/api/trpc", createCustomRateLimiter(300, 60 * 1000));

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Register storage proxy
  registerStorageProxy(app);

  // Health check route returning status and boolean checks for critical env vars (never raw values)
  app.get("/api/health", (_req: Request, res: Response) => {
    const isStrictMode = process.env.COPERNICUS_STRICT_MODE === "true";
    const hasClientId = Boolean(process.env.COPERNICUS_CLIENT_ID);
    const hasClientSecret = Boolean(process.env.COPERNICUS_CLIENT_SECRET);
    const isHealthy = !isStrictMode || (hasClientId && hasClientSecret);

    const envChecks = {
      supabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      copernicusClientId: hasClientId,
      copernicusClientSecret: hasClientSecret,
      copernicusStrictMode: isStrictMode,
    };

    if (!isHealthy) {
      res.status(503).json({
        status: "error",
        service: "agropulso-cleanleaf-api",
        error: "COPERNICUS_STRICT_MODE=true requiere COPERNICUS_CLIENT_ID y COPERNICUS_CLIENT_SECRET configuradas.",
        checks: envChecks,
      });
      return;
    }

    res.json({
      status: "ok",
      service: "agropulso-cleanleaf-api",
      timestamp: new Date().toISOString(),
      checks: envChecks,
    });
  });

  // tRPC API middleware
  const trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext,
  });

  app.use("/api/trpc", trpcMiddleware);
  app.use("/trpc", trpcMiddleware);

  // Fallback 404 handler for any unhandled /api/* routes (must return JSON, never HTML)
  app.use("/api/*", (_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "API route not found",
      },
    });
  });

  return app;
}
