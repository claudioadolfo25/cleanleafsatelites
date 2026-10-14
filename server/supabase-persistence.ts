import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseIdentity } from "./supabase-auth";
import type { AnalysisReport } from "@shared/observation-provider";
import type { ReportFilters, ReportRecord } from "@shared/report-catalog";
import type { AnalysisStatus } from "@shared/analysis-state";
import type { SatelliteId } from "@shared/satellite-catalog";

export type PersistenceIdentity = SupabaseIdentity;

type PersistedRequest = {
  id: string;
  tenant_id: string;
  predio_id: string | null;
  superficie_ha: number;
  tier: string;
  satelites_solicitados: string[];
  estado: AnalysisStatus;
  motor_usado: string | null;
  variables_solicitadas: string[];
  correlation_id: string;
  idempotency_key: string;
  resultado_informe_id: string | null;
};

type PersistedReport = {
  id: string;
  tenant_id: string;
  solicitud_id: string | null;
  fecha_generacion: string;
  contenido: {
    report?: AnalysisReport;
    predioNombre?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    satellites?: SatelliteId[];
    variables?: string[];
    status?: AnalysisStatus;
    trace?: ReportRecord["trace"];
    source?: "synthetic" | "copernicus_cdse";
  };
};

let client: SupabaseClient | null | undefined;

export function getSupabasePersistenceClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    client = null;
    return client;
  }
  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

export function getPersistenceIdentity(identity: SupabaseIdentity | null): PersistenceIdentity | null {
  if (!identity?.userId || !identity.tenantId) return null;
  return identity;
}

export function resetSupabasePersistenceForTests() {
  client = undefined;
}

function toReportRecord(row: PersistedReport): ReportRecord | null {
  const report = row.contenido.report;
  if (!report) return null;
  const status = row.contenido.status ?? (report.estado as AnalysisStatus);
  const trace = row.contenido.trace ?? [
    { at: row.fecha_generacion, actor: "usuario", status: "pendiente", message: "Solicitud recibida", detail: "Solicitud persistida en Supabase." },
    { at: row.fecha_generacion, actor: "workflow", status, message: status === "completado" ? "Informe sintético disponible" : "Estado actualizado", detail: row.contenido.source === "synthetic" ? "Resultado sintético; Copernicus CDSE no estaba configurado." : "Resultado generado por Copernicus CDSE." },
  ];
  return {
    id: row.id,
    tenantId: row.tenant_id,
    predioId: report.predioId,
    predioNombre: row.contenido.predioNombre ?? report.predioNombre,
    fechaDesde: row.contenido.fechaDesde ?? report.periodo.desde,
    fechaHasta: row.contenido.fechaHasta ?? report.periodo.hasta,
    generatedAt: row.fecha_generacion,
    satellites: row.contenido.satellites ?? [report.fuentes[0]?.satelite ?? "sentinel-2"],
    variables: row.contenido.variables ?? [report.fuentes[0]?.variable ?? "ndvi"],
    status,
    progress: status === "completado" ? 100 : 50,
    currentStep: status === "completado" ? "Informe listo" : "Procesando solicitud",
    alertLevel: "normal",
    summary: report.resumen,
    recommendation: report.recomendaciones[0] ?? "Comparar con observaciones de terreno.",
    trace,
    metrics: report.hallazgos.map(item => ({ label: item.variable, value: String(item.valor_actual), comparison: "Resultado sintético; validar en terreno." })),
    source: "user",
    dataSource: row.contenido.source ?? "synthetic",
  };
}

export async function persistAnalysis(input: {
  identity: PersistenceIdentity;
  request: {
    predioId: string;
    predioNombre: string;
    hectareas: number;
    tier: string;
    satellites: SatelliteId[];
    variables: string[];
    estado: AnalysisStatus;
    motorUsado: string;
    correlationId: string;
    idempotencyKey: string;
  };
  report: AnalysisReport;
  source: "synthetic" | "copernicus_cdse";
}): Promise<{ reportId: string; report: ReportRecord } | null> {
  const supabase = getSupabasePersistenceClient();
  if (!supabase) return null;
  const { identity, request, report, source } = input;
  const { data: existing } = await supabase.from("solicitudes_analisis").select("id, resultado_informe_id").eq("tenant_id", identity.tenantId).eq("idempotency_key", request.idempotencyKey).maybeSingle();
  if (existing?.resultado_informe_id) {
    const { data: existingReport } = await supabase.from("informes").select("*").eq("tenant_id", identity.tenantId).eq("id", existing.resultado_informe_id).maybeSingle();
    if (existingReport) {
      const mapped = toReportRecord(existingReport as PersistedReport);
      if (mapped) return { reportId: mapped.id, report: mapped };
    }
  }

  const { data: solicitud, error: requestError } = await supabase.from("solicitudes_analisis").insert({
    tenant_id: identity.tenantId,
    predio_id: null,
    geometria: {},
    superficie_ha: request.hectareas,
    tier: request.tier,
    satelites_solicitados: request.satellites,
    estado: request.estado,
    motor_usado: request.motorUsado,
    variables_solicitadas: request.variables,
    correlation_id: request.correlationId,
    idempotency_key: request.idempotencyKey,
    solicitado_por: identity.userId,
  }).select("*").single();
  if (requestError || !solicitud) throw new Error(`No se pudo persistir la solicitud: ${requestError?.message ?? "respuesta vacía"}`);

  const generatedAt = new Date().toISOString();
  const trace: ReportRecord["trace"] = [
    { at: generatedAt, actor: "usuario", status: "pendiente", message: "Solicitud recibida", detail: `Solicitud ${solicitud.id} persistida en Supabase.` },
    { at: generatedAt, actor: "workflow", status: request.estado, message: request.estado === "completado" ? "Informe sintético disponible" : "Solicitud registrada", detail: source === "synthetic" ? "Copernicus CDSE no configurado; resultado sintético explícito." : "Resultado generado por Copernicus CDSE." },
  ];
  const contenido = { report, predioNombre: request.predioNombre, fechaDesde: report.periodo.desde, fechaHasta: report.periodo.hasta, satellites: request.satellites, variables: request.variables, status: request.estado, trace, source };
  const { data: informe, error: reportError } = await supabase.from("informes").insert({ tenant_id: identity.tenantId, predio_id: null, solicitud_id: solicitud.id, tipo_lente: "agro", contenido }).select("*").single();
  if (reportError || !informe) throw new Error(`No se pudo persistir el informe: ${reportError?.message ?? "respuesta vacía"}`);
  const { error: linkError } = await supabase.from("solicitudes_analisis").update({ resultado_informe_id: informe.id, actualizado_en: generatedAt }).eq("tenant_id", identity.tenantId).eq("id", solicitud.id);
  if (linkError) throw new Error(`No se pudo enlazar la solicitud con el informe: ${linkError.message}`);
  const mapped = toReportRecord(informe as PersistedReport);
  if (!mapped) throw new Error("El informe persistido no contiene un contenido compatible");
  return { reportId: informe.id, report: mapped };
}

export async function listPersistedReports(identity: PersistenceIdentity, filters: ReportFilters = {}): Promise<ReportRecord[]> {
  const supabase = getSupabasePersistenceClient();
  if (!supabase) return [];
  let query = supabase.from("informes").select("*").eq("tenant_id", identity.tenantId).order("creado_en", { ascending: false });
  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron leer los informes persistidos: ${error.message}`);
  return (data as PersistedReport[]).map(toReportRecord).filter((report): report is ReportRecord => Boolean(report)).filter(report => (!filters.search || `${report.predioNombre} ${report.variables.join(" ")}`.toLowerCase().includes(filters.search.toLowerCase())) && (!filters.predio || report.predioNombre === filters.predio) && (!filters.satellite || report.satellites.includes(filters.satellite as SatelliteId)) && (!filters.status || filters.status === "todos" || report.status === filters.status));
}

export async function getPersistedReport(identity: PersistenceIdentity, id: string): Promise<ReportRecord | null> {
  const supabase = getSupabasePersistenceClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("informes").select("*").eq("tenant_id", identity.tenantId).eq("id", id).maybeSingle();
  if (error) throw new Error(`No se pudo leer el informe persistido: ${error.message}`);
  return data ? toReportRecord(data as PersistedReport) : null;
}
