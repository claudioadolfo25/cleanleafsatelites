import { createHash } from "node:crypto";
import {
  getReportByIdDb,
  getPredioByIdDb,
  getSolicitudByIdDb,
  listEscenasForInformeDb,
  listObservacionesSerieDb,
} from "../db/repository";

export type ReportViewModel = {
  reportId: string;
  tenantId: string;
  version: string; // e.g. "v1"
  predioNombre: string;
  fechaDesde: string;
  fechaHasta: string;
  fechaProcesamiento: string;
  satellites: string[];
  variables: string[];
  summary: string;
  recommendation: string;
  interpretation?: any;
  timeSeries: Array<{
    intervaloDesde: string;
    intervaloHasta: string;
    valor: number | null;
    nivelConfianza: string;
    evalscriptVersion: string;
    evalscriptHash: string;
  }>;
  provenance: {
    attributionText: string;
    evalscriptVersion: string;
    evalscriptHash: string;
    scenes: Array<{
      id: string;
      producto: string;
      fechaSensado: string;
      coberturaNubes: number | null;
      baselineProcesamiento: string | null;
    }>;
  };
  viewModelHash: string;
};

export async function buildReportViewModel(
  tenantId: string,
  reportId: string,
  accessToken?: string
): Promise<ReportViewModel> {
  // LECTURA EXCLUSIVA DE BASE DE DATOS (PROHIBIDO LLAMAR A COPERNICUS CDSE)
  const report = await getReportByIdDb(tenantId, reportId, accessToken);
  if (!report) {
    throw new Error(`Informe ${reportId} no encontrado en la base de datos`);
  }

  const predio = await getPredioByIdDb(tenantId, report.predioId, accessToken);
  const solicitud = await getSolicitudByIdDb(tenantId, reportId, accessToken);
  const escenas = await listEscenasForInformeDb(tenantId, reportId, accessToken);

  const primarySatellite = report.satellites[0] ?? "sentinel-2";
  const primaryVariable = report.variables[0] ?? "ndvi";

  const series = await listObservacionesSerieDb(
    tenantId,
    report.predioId,
    primarySatellite,
    primaryVariable,
    accessToken
  );

  const formattedSeries = series.map((s) => ({
    intervaloDesde: s.intervalo_desde,
    intervaloHasta: s.intervalo_hasta,
    valor: s.valor,
    nivelConfianza: s.nivel_confianza ?? "alta",
    evalscriptVersion: s.evalscript_version ?? "v1.0.0",
    evalscriptHash: s.evalscript_hash ?? "v1_hash",
  }));

  const scenesFormatted = escenas.map((e) => ({
    id: e.id,
    producto: e.producto,
    fechaSensado: e.fecha_sensado,
    coberturaNubes: e.cobertura_nubes ?? null,
    baselineProcesamiento: e.baseline_procesamiento ?? null,
  }));

  const years = Array.from(
    new Set(scenesFormatted.map((s) => new Date(s.fechaSensado).getFullYear()).filter((y) => !isNaN(y)))
  ).sort();
  const yearsStr = years.length > 0 ? years.join(", ") : new Date().getFullYear().toString();
  const attributionText = `Contiene datos modificados de Copernicus Sentinel [${yearsStr}]`;

  const evalscriptVersion = formattedSeries[0]?.evalscriptVersion ?? "v1.0.0";
  const evalscriptHash = formattedSeries[0]?.evalscriptHash ?? "hash_default";

  const rawViewModel = {
    reportId: report.id,
    tenantId: report.tenantId,
    version: "v1",
    predioNombre: report.predioNombre || predio?.nombre || "Predio",
    fechaDesde: report.fechaDesde,
    fechaHasta: report.fechaHasta,
    fechaProcesamiento: report.generatedAt,
    satellites: report.satellites,
    variables: report.variables,
    summary: report.summary,
    recommendation: report.recommendation,
    interpretation: (report as any).interpretation ?? null,
    timeSeries: formattedSeries,
    provenance: {
      attributionText,
      evalscriptVersion,
      evalscriptHash,
      scenes: scenesFormatted,
    },
  };

  const viewModelHash = createHash("sha256")
    .update(JSON.stringify(rawViewModel))
    .digest("hex");

  return {
    ...rawViewModel,
    viewModelHash,
  };
}
