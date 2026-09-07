import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: async () => ({ user: null }),
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mode: "vercel-serverless" });
});

export default app;
