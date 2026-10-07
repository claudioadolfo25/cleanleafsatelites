import type { SatelliteId } from "./satellite-catalog";
import type { Tier } from "./satellite-service";
import { interpretMeasurement } from "./interpretation";
import type { SentinelMeasurement } from "./satellite-service";

export type SatelliteQueryRequest = {
  predioId: string;
  satellite: SatelliteId;
  variable: string;
  tier: Tier;
  periodFrom?: string;
  periodTo?: string;
};

export interface EarthObservationProvider {
  query(request: SatelliteQueryRequest): Promise<SentinelMeasurement>;
}

export class MockCopernicusProvider implements EarthObservationProvider {
  async query(request: SatelliteQueryRequest): Promise<SentinelMeasurement> {
    const { querySentinel } = await import("./satellite-service");
    return querySentinel(request.predioId, request.satellite, request.variable);
  }
}

export type AnalysisReport = {
  id: string;
  estado: "completado";
  predioId: string;
  predioNombre: string;
  tier: Tier;
  periodo: { desde: string; hasta: string };
  fuentes: Array<{ satelite: SatelliteId; variable: string; unidad: string }>;
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
    fuentes: [{ satelite: measurement.satelite, variable: measurement.variable, unidad: measurement.unidad }],
    resumen: interpretation,
    hallazgos: [{ tipo: "lectura_actual", severidad: measurement.valor < 0.3 && measurement.variable === "ndvi" ? "alta" : "baja", fuente: measurement.satelite, variable: measurement.variable, valor_actual: measurement.valor }],
    recomendaciones: ["Comparar este resultado con observaciones de terreno y la lectura anterior."],
    limitaciones: ["Resultado generado por proveedor mock hasta conectar Copernicus CDSE en staging."],
    mediciones: [measurement],
    generado_en: new Date().toISOString(),
  };
}
