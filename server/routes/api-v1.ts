import { Router, type Request, type Response } from "express";
import { fetchWeatherForecast } from "../../shared/weather-service";
import { calculateCropStage, type CropType } from "../../shared/crop-calendar";

export const apiV1Router = Router();

apiV1Router.get("/health", (_req: Request, res: Response) => {
  res.json({
    data: { status: "ok", version: "v1", timestamp: new Date().toISOString() },
    error: null,
    provenance: {
      data_source: "estimated",
      badge_label: "API V1 STUB / HEALTH",
      confidence: 1.0,
    },
  });
});

apiV1Router.get("/weather/forecast", async (req: Request, res: Response) => {
  const lat = Number(req.query.lat ?? -38.73);
  const lng = Number(req.query.lng ?? -72.60);

  try {
    const weather = await fetchWeatherForecast(lat, lng);
    res.json({
      data: weather,
      error: null,
      provenance: weather.provenance,
    });
  } catch (error: any) {
    res.status(500).json({
      data: null,
      error: { code: "WEATHER_FETCH_ERROR", message: error?.message || "Error al obtener pronóstico" },
    });
  }
});

apiV1Router.get("/crop-calendar/stage", (req: Request, res: Response) => {
  const crop = (req.query.crop as CropType) || "trigo";
  const sowingDate = (req.query.sowingDate as string) || "2026-05-15";
  const gdd = Number(req.query.gdd ?? 450);

  try {
    const stage = calculateCropStage(crop, sowingDate, gdd);
    res.json({
      data: stage,
      error: null,
      provenance: stage.provenance,
    });
  } catch (error: any) {
    res.status(500).json({
      data: null,
      error: { code: "CALENDAR_ERROR", message: error?.message || "Error al calcular etapa fenológica" },
    });
  }
});
