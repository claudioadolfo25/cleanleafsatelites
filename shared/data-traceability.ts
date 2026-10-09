export type DataSourceType = "copernicus_cdse" | "simulated" | "unavailable";

export type MeasurementMetadata = {
  data_source: DataSourceType;
  confidence: number;
  acquired_at: string;
  cloud_cover?: number;
  simulated_badge?: boolean;
  message?: string;
};

export function isProductionEnv(): boolean {
  if (typeof process !== "undefined" && process?.env) {
    return process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";
  }
  return false;
}

export function resolveDataTraceability(
  hasLiveResponse: boolean,
  providerName: string,
  rawAcquiredAt?: string,
  rawCloudCover?: number
): MeasurementMetadata {
  const isProd = isProductionEnv();

  if (hasLiveResponse && providerName.toLowerCase().includes("copernicus")) {
    return {
      data_source: "copernicus_cdse",
      confidence: 0.95,
      acquired_at: rawAcquiredAt ?? new Date().toISOString(),
      cloud_cover: rawCloudCover ?? 0,
      simulated_badge: false,
    };
  }

  if (isProd) {
    return {
      data_source: "unavailable",
      confidence: 0,
      acquired_at: new Date().toISOString(),
      simulated_badge: false,
      message: "Servicio de datos satelitales en vivo no disponible actualmente en entorno de producción.",
    };
  }

  return {
    data_source: "simulated",
    confidence: 0.8,
    acquired_at: rawAcquiredAt ?? new Date().toISOString(),
    cloud_cover: rawCloudCover ?? 5.0,
    simulated_badge: true,
    message: "Datos de demostración simulados para entorno de desarrollo y pruebas.",
  };
}
