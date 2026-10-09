import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

export function createApp(): Express {
  const app = express();

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Register storage proxy and OAuth routes
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Health check route for Vercel and server monitoring
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "agropulso-cleanleaf-api", timestamp: new Date().toISOString() });
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
