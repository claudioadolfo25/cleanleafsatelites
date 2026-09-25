import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { apiV1Router } from "../routes/api-v1";

const app = express();

// Basic JSON and URL encoded body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware with environment-based domain restriction
app.use((req, res, next) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*").split(",");
  const origin = req.headers.origin;

  if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Register versioned Express REST API routes
app.use("/api/v1", apiV1Router);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

const server = createServer(app);
const port = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => {
    console.log(`[AgroPulso API] Serving REST v1 on port ${port}`);
  });
}

export { app, server };
