import { describe, expect, it } from "vitest";
import express from "express";
import { apiV1Router } from "./api-v1";
import axios from "axios";

describe("REST API v1 Weather & Crop Calendar Endpoints", () => {
  it("exposes /weather/forecast with provenance envelope", async () => {
    const app = express();
    app.use("/api/v1", apiV1Router);
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const response = await axios.get(`http://localhost:${port}/api/v1/weather/forecast?lat=-38.7&lng=-72.6`);
      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();
      expect(response.data.provenance).toBeDefined();
      expect(response.data.provenance.data_source).toBe("synthetic");
    } finally {
      server.close();
    }
  });

  it("exposes /crop-calendar/stage with provenance envelope", async () => {
    const app = express();
    app.use("/api/v1", apiV1Router);
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const response = await axios.get(`http://localhost:${port}/api/v1/crop-calendar/stage?crop=trigo&gdd=480`);
      expect(response.status).toBe(200);
      expect(response.data.data.crop).toBe("trigo");
      expect(response.data.provenance.data_source).toBe("estimated");
    } finally {
      server.close();
    }
  });
});
