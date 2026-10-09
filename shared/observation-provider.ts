import type { SatelliteId } from "./satellite-catalog";
import type { Tier } from "./satellite-service";
import { interpretMeasurement } from "./interpretation";
import type { SentinelMeasurement } from "./satellite-service";
import { resolveDataTraceability, type DataSourceType } from "./data-traceability";

export type SatelliteQueryRequest = {
  predioId: string;
  satellite: SatelliteId;
  variable: string;
  tier: Tier;
  periodFrom?: string;
  periodTo?: string;
  bbox?: [number, number, number, number];
};

export interface EarthObservationProvider {
  query(request: SatelliteQueryRequest): Promise<SentinelMeasurement & {
    data_source?: DataSourceType;
    confidence?: number;
    acquired_at?: string;
    cloud_cover?: number;
  }>;
}

export class MockCopernicusProvider implements EarthObservationProvider {
  async query(request: SatelliteQueryRequest): Promise<SentinelMeasurement & {
    data_source?: DataSourceType;
    confidence?: number;
    acquired_at?: string;
    cloud_cover?: number;
  }> {
    const { querySentinel } = await import("./satellite-service");
    const raw = await querySentinel(request.predioId, request.satellite, request.variable);
    const traceability = resolveDataTraceability(false, "MockCopernicusProvider", raw.fecha_adquisicion ? raw.fecha_adquisicion.toISOString() : undefined);

    if (traceability.data_source === "unavailable") {
      return {
        ...raw,
        valor: 0,
        unidad: "N/A",
        data_source: "unavailable",
        confidence: 0,
        acquired_at: new Date().toISOString(),
        cloud_cover: 0,
      };
    }

    return {
      ...raw,
      data_source: "simulated",
      confidence: traceability.confidence,
      acquired_at: traceability.acquired_at,
      cloud_cover: traceability.cloud_cover,
    };
  }
}

export type AnalysisReport = {
  id: string;
  estado: "completado";
  predioId: string;
  predioNombre: string;
  tier: Tier;
  periodo: { desde: string; hasta: string };
  fuentes: Array<{ satelite: SatelliteId; variable: string; unidad: string; data_source?: string }>;
  resumen: string;
  hallazgos: Array<{ tipo: string; severidad: "baja" | "media" | "alta"; fuente: SatelliteId; variable: string; valor_actual: number }>;
  recomendaciones: string[];
  limitaciones: string[];
  mediciones: SentinelMeasurement[];
  generado_en: string;
};

export function buildAnalysisReport(input: { id: string; predioId: string; predioNombre: string; tier: Tier; measurement: SentinelMeasurement; periodFrom?: string; periodTo?: string }): AnalysisReport {
  const { measurement } = input;
  const periodFrom = input.periodFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const periodTo = input.periodTo ?? new Date().toISOString();
  const interpretation = interpretMeasurement(measurement);
  return {
    id: `report-${input.id}`,
    estado: "completado",
    predioId: input.predioId,
    predioNombre: input.predioNombre,
    tier: input.tier,
    periodo: { desde: periodFrom, hasta: periodTo },
    fuentes: [{ satelite: measurement.satelite, variable: measurement.variable, unidad: measurement.unidad, data_source: measurement.data_source }],
    resumen: interpretation,
    hallazgos: [{ tipo: "lectura_actual", severidad: measurement.valor < 0.3 && measurement.variable === "ndvi" ? "alta" : "baja", fuente: measurement.satelite, variable: measurement.variable, valor_actual: measurement.valor }],
    recomendaciones: ["Comparar este resultado con observaciones de terreno y la lectura anterior."],
    limitaciones: measurement.data_source === "copernicus_cdse" ? ["Resultado obtenido desde Copernicus CDSE; validar con observaciones de terreno."] : ["Resultado generado por proveedor simulado hasta activar Copernicus CDSE en modo live."],
    mediciones: [measurement],
    generado_en: new Date().toISOString(),
  };
}
