import "dotenv/config";
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { serveStatic, setupVite } from "./_core/vite";
import type { Server } from "node:http";

/** Creates the app without binding a port, which is required by Vercel Functions. */
export async function createApp(options: { development?: boolean; server?: Server; includeStatic?: boolean } = {}): Promise<Express> {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  const trpcMiddleware = createExpressMiddleware({ router: appRouter, createContext });
  app.use("/api/trpc", trpcMiddleware);
  app.use("/trpc", trpcMiddleware);

  if (options.development) {
    if (!options.server) throw new Error("A development HTTP server is required for Vite middleware");
    await setupVite(app, options.server);
  } else if (options.includeStatic !== false) {
    serveStatic(app);
  }
  return app;
}
