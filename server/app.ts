import express, { type Express, type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

export function createApp(): Express {
  const app = express();

  // Trust Render reverse proxy for x-forwarded-proto and client IP
  app.set("trust proxy", 1);

  // Configure default global body parser with strict 100kb limit
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ limit: "100kb", extended: true }));

  // Register storage proxy with 50mb limit for uploads and OAuth routes
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Public lightweight health check route
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "cleanleaf-api",
      timestamp: new Date().toISOString(),
    });
  });

  // Protected detailed health check route
  app.get("/api/health/details", (_req: Request, res: Response) => {
    const envChecks = {
      supabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      copernicusClientId: Boolean(process.env.COPERNICUS_CLIENT_ID),
      copernicusClientSecret: Boolean(process.env.COPERNICUS_CLIENT_SECRET),
    };

    res.json({
      status: "ok",
      service: "cleanleaf-api",
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
