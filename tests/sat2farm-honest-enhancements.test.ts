import { describe, expect, it, vi } from "vitest";
import { createTraceableMetadata } from "../shared/data-traceability";
import { fetch15DayWeatherForecast } from "../shared/weather-service";
import { calculateGDD, getCurrentPhenologyStage } from "../shared/crop-calendar";

describe("Honest Data Traceability & Production Enforcements (Tarea 1)", () => {
  it("attaches simulated badge when using fallback in dev environment", () => {
    process.env.APP_ENV = "development";
    const result = createTraceableMetadata({ ndvi: 0.65 }, { source: "fallback_simulated" });
    expect(result.data_source).toBe("fallback_simulated");
    expect(result.simulated_badge).toBe(true);
    expect(result.confidence).toBe("baja");
  });

  it("blocks simulated fallbacks when APP_ENV is production", () => {
    process.env.APP_ENV = "production";
    const result = createTraceableMetadata({ ndvi: 0.65 }, { source: "fallback_simulated" });
    expect(result.data_source).toBe("unavailable");
    expect(result.data).toBeNull();
    expect(result.simulated_badge).toBe(false);
    expect(result.message).toContain("producción");
    process.env.APP_ENV = "development";
  });
});

describe("Open-Meteo 15-Day Weather Forecast Service (Tarea 2)", () => {
  it("fetches weather forecast or returns fallback structure with 15-16 days", async () => {
    // Mock fetch response for offline test execution
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        daily: {
          time: Array.from({ length: 16 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`),
          temperature_2m_max: Array.from({ length: 16 }, () => 22.5),
          temperature_2m_min: Array.from({ length: 16 }, () => 10.0),
          precipitation_sum: Array.from({ length: 16 }, () => 1.2),
          relative_humidity_2m_mean: Array.from({ length: 16 }, () => 65),
          et0_fao_evapotranspiration: Array.from({ length: 16 }, () => 3.2),
          wind_speed_10m_max: Array.from({ length: 16 }, () => 15.0),
        },
      }),
    }));

    const forecast = await fetch15DayWeatherForecast(-38.73, -72.59, { timeoutMs: 2500 });
    expect(forecast.days.length).toBeGreaterThanOrEqual(15);
    expect(forecast.summary.total_precipitation_15d_mm).toBeGreaterThanOrEqual(0);
    expect(forecast.days[0]).toHaveProperty("et0_fao_evapotranspiration_mm");
    expect(forecast.days[0]).toHaveProperty("temp_max_c");

    vi.unstubAllGlobals();
  });
});

describe("Crop Calendar & Growing Degree Days Engine (Tarea 5)", () => {
  it("calculates Growing Degree Days (GDD) correctly with base temperature", () => {
    const gdd = calculateGDD(25, 15, 10); // (20) - 10 = 10 GDD
    expect(gdd).toBe(10);

    const zeroGdd = calculateGDD(8, 4, 10); // (6) - 10 = -4 -> 0
    expect(zeroGdd).toBe(0);
  });

  it("evaluates phenology stage progress for corn (maiz)", () => {
    const plantingDate = "2026-01-01";
    const weatherDays = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      temp_max_c: 26,
      temp_min_c: 14,
    }));

    const result = getCurrentPhenologyStage("maiz", plantingDate, weatherDays);
    expect(result.accumulatedGDD).toBeGreaterThan(0);
    expect(result.currentStage).toBeDefined();
    expect(result.currentStage.critical_tasks.length).toBeGreaterThan(0);
  });
});
