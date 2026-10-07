export type DataSource = "copernicus_cdse" | "open_meteo" | "fallback_simulated" | "unavailable";
export type DataConfidence = "alta" | "media" | "baja";

export type TraceableDataEnvelope<T> = {
  data: T | null;
  data_source: DataSource;
  confidence: DataConfidence;
  acquisition_date: string;
  cloud_cover_pct?: number;
  message?: string;
  simulated_badge?: boolean;
};

export function createTraceableMetadata<T>(
  data: T | null,
  options: {
    source: DataSource;
    confidence?: DataConfidence;
    acquisitionDate?: string;
    cloudCoverPct?: number;
    message?: string;
  }
): TraceableDataEnvelope<T> {
  const isProd = process.env.APP_ENV === "production" || process.env.NODE_ENV === "production";

  if (options.source === "fallback_simulated" && isProd) {
    return {
      data: null,
      data_source: "unavailable",
      confidence: "baja",
      acquisition_date: new Date().toISOString(),
      message: "Datos reales no disponibles en ambiente de producción.",
      simulated_badge: false,
    };
  }

  const isSimulated = options.source === "fallback_simulated";

  return {
    data,
    data_source: options.source,
    confidence: options.confidence ?? (isSimulated ? "baja" : "alta"),
    acquisition_date: options.acquisitionDate ?? new Date().toISOString(),
    cloud_cover_pct: options.cloudCoverPct,
    message: options.message,
    simulated_badge: isSimulated,
  };
}
