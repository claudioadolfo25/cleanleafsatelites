import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext: async (opts) => {
    try {
      return await createContext(opts);
    } catch (error) {
      console.warn("[tRPC Context Warning] Database or OAuth unavailable in serverless environment, falling back to public context:", error);
      return { req: opts.req, res: opts.res, user: null };
    }
  },
  onError: ({ error, path }) => {
    console.error(`[tRPC Error] path=${path}:`, error);
  },
});

app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);

const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok", mode: "vercel-serverless" });
};

app.get("/api/health", healthHandler);
app.get("/health", healthHandler);

export default app;
