import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext: async ({ req, res }) => ({ req, res, user: null }),
});

app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);

const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok", mode: "vercel-serverless" });
};

app.get("/api/health", healthHandler);
app.get("/health", healthHandler);

export default app;
