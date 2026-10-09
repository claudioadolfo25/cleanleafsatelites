import type { Request, Response } from "express";
import { createApp } from "../server/app";

// Initialize Express app instance once at module level for warm start reuse in Vercel Serverless
const app = createApp();

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
