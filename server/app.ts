import express, { type Express, type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

export function createApp(): Express {
  const app = express();

  // Trust Vercel reverse proxy for protocol (x-forwarded-proto) and client IP
  app.set("trust proxy", 1);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Register storage proxy and OAuth routes
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Health check route returning status and presence booleans for critical env vars (never raw secrets)
  app.get("/api/health", (_req: Request, res: Response) => {
    const envStatus = {
      supabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      supabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      copernicusClientId: Boolean(process.env.COPERNICUS_CLIENT_ID),
      copernicusClientSecret: Boolean(process.env.COPERNICUS_CLIENT_SECRET),
    };

    res.json({
      status: "ok",
      service: "agropulso-cleanleaf-api",
      timestamp: new Date().toISOString(),
      env: envStatus,
    });
  });

  // tRPC API middleware - mounted at both /api/trpc and /trpc for Vercel rewrite compatibility
  const trpcMiddleware = createExpressMiddleware({
    router: appRouter,
    createContext,
  });

  app.use("/api/trpc", trpcMiddleware);
  app.use("/trpc", trpcMiddleware);

  return app;
}
