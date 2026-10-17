import type { PlanId } from "../../shared/plan-limits";
import type { ReportRecord } from "../../shared/report-catalog";
import type { AnalysisStatus } from "../../shared/analysis-state";
import type { SatelliteId } from "../../shared/satellite-catalog";
import { getSupabaseUserClient } from "./supabase-client";

export type SolicitudRecord = {
  id?: string;
  tenant_id: string;
  predio_id?: string | null;
  geometria?: Record<string, unknown>;
  superficie_ha: number;
  tier: "tier1_predio" | "tier2_extendido" | "tier3_regional";
  satelites_solicitados: string[];
  estado: string;
  motor_usado?: string;
  variables_solicitadas: string[];
  correlation_id: string;
  idempotency_key: string;
  resultado_informe_id?: string | null;
  mensaje_error?: string | null;
  solicitado_por?: string | null;
  creado_en?: string;
};

export type InformeRecord = {
  id?: string;
  tenant_id: string;
  predio_id?: string | null;
  solicitud_id?: string | null;
  tipo_lente?: string;
  contenido: Record<string, unknown>;
  fecha_generacion?: string;
};

export type MedicionRecord = {
  id?: string;
  tenant_id: string;
  predio_id: string;
  solicitud_id?: string | null;
  satelite: "sentinel-1" | "sentinel-2" | "sentinel-3";
  variable: string;
  valor: number;
  unidad?: string | null;
  fecha_adquisicion: string;
};

// Almacenamiento en memoria para fallback en entornos de prueba o locales sin conexión live
const memorySolicitudes = new Map<string, SolicitudRecord>();
const memoryInformes = new Map<string, InformeRecord>();
const memoryMediciones: MedicionRecord[] = [];
const memoryConsumo: { tenant_id: string; fecha: string; ha_procesadas: number }[] = [];
const memoryWorkflowLogs: { tenant_id: string; workflow_nombre: string; estado: "exitoso" | "fallido"; mensaje_error?: string | null; payload?: any }[] = [];

function mapInformeToReportRecord(inf: any): ReportRecord {
  const contenido = inf.contenido || {};
  const sol = inf.solicitudes_analisis || {};

  return {
    id: inf.solicitud_id || inf.id || `inf-${Date.now()}`,
    tenantId: inf.tenant_id ?? "tenant-default",
    predioId: inf.predio_id ?? "predio-default",
    predioNombre: contenido.predioNombre || sol.predio_nombre || "Predio",
    fechaDesde: contenido.periodo?.desde || new Date().toISOString().slice(0, 10),
    fechaHasta: contenido.periodo?.hasta || new Date().toISOString().slice(0, 10),
    generatedAt: inf.fecha_generacion || new Date().toISOString(),
    satellites: (contenido.satellites || sol.satelites_solicitados || ["sentinel-2"]) as SatelliteId[],
    variables: (contenido.variables || sol.variables_solicitadas || ["ndvi"]) as string[],
    status: (contenido.estado || sol.estado || "completado") as AnalysisStatus,
    progress: contenido.estado === "completado" ? 100 : 50,
    currentStep: contenido.estado === "completado" ? "Informe listo" : "Procesando",
    alertLevel: contenido.alertLevel || "normal",
    summary: contenido.resumen || "Resumen del análisis realizado.",
    recommendation: contenido.recomendacion || "Comparar este resultado con observaciones de terreno.",
    trace: contenido.trace || [],
    metrics: contenido.metrics || [],
  };
}

export async function getTenantUsageAndLimits(
  tenantId: string,
  accessToken?: string
): Promise<{ planId: PlanId; haMesUsadas: number; prediosActivos: number }> {
  const client = getSupabaseUserClient(accessToken);

  let planId: PlanId = "regional_pyme";
  let haMesUsadas = 0;
  let prediosActivos = 1;

  if (client) {
    try {
      // 1. Obtener plan activo del tenant desde suscripciones y planes
      const { data: subData } = await client
        .from("suscripciones")
        .select("plan_id, planes(nombre)")
        .eq("tenant_id", tenantId)
        .eq("estado", "activa")
        .maybeSingle();

      if (subData?.planes) {
        const planNombre = (subData.planes as any).nombre?.toLowerCase();
        if (planNombre?.includes("piloto")) {
          planId = "piloto";
        } else if (planNombre?.includes("completa") || planNombre?.includes("region")) {
          planId = "region_completa";
        } else {
          planId = "regional_pyme";
        }
      }

      // 2. Sumar consumo de hectáreas en el mes actual
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: consumoData } = await client
        .from("consumo")
        .select("ha_procesadas")
        .eq("tenant_id", tenantId)
        .gte("fecha", startOfMonth.split("T")[0]);

      if (consumoData && consumoData.length > 0) {
        haMesUsadas = consumoData.reduce((acc, c) => acc + (Number(c.ha_procesadas) || 0), 0);
      }

      // 3. Contar predios activos
      const { count } = await client
        .from("predios")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      if (count && count > 0) {
        prediosActivos = count;
      }

      return { planId, haMesUsadas, prediosActivos };
    } catch {
      // Fallback a cálculo en memoria si falla la consulta
    }
  }

  // Fallback en memoria
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  haMesUsadas = memoryConsumo
    .filter(c => c.tenant_id === tenantId && c.fecha.startsWith(currentMonthPrefix))
    .reduce((acc, c) => acc + c.ha_procesadas, 0);

  return { planId, haMesUsadas, prediosActivos };
}

export async function createSolicitudAnalisisDb(
  solicitud: SolicitudRecord,
  accessToken?: string
): Promise<SolicitudRecord> {
  const client = getSupabaseUserClient(accessToken);
  const idempotencyKeyInTenant = `${solicitud.tenant_id}:${solicitud.idempotency_key}`;

  if (client) {
    const { data: existing } = await client
      .from("solicitudes_analisis")
      .select("*")
      .eq("tenant_id", solicitud.tenant_id)
      .eq("idempotency_key", solicitud.idempotency_key)
      .maybeSingle();

    if (existing) {
      return existing as SolicitudRecord;
    }

    const { data: inserted, error } = await client
      .from("solicitudes_analisis")
      .insert({
        tenant_id: solicitud.tenant_id,
        predio_id: solicitud.predio_id ?? null,
        geometria: solicitud.geometria ?? {},
        superficie_ha: solicitud.superficie_ha,
        tier: solicitud.tier,
        satelites_solicitados: solicitud.satelites_solicitados,
        estado: solicitud.estado,
        motor_usado: solicitud.motor_usado,
        variables_solicitadas: solicitud.variables_solicitadas,
        correlation_id: solicitud.correlation_id,
        idempotency_key: solicitud.idempotency_key,
        solicitado_por: solicitud.solicitado_por ?? null,
      })
      .select()
      .single();

    if (error && error.code === "23505") {
      const { data: reFetched } = await client
        .from("solicitudes_analisis")
        .select("*")
        .eq("tenant_id", solicitud.tenant_id)
        .eq("idempotency_key", solicitud.idempotency_key)
        .single();

      if (reFetched) return reFetched as SolicitudRecord;
    }

    if (inserted) {
      return inserted as SolicitudRecord;
    }
  }

  // Fallback en memoria
  const memoryKey = idempotencyKeyInTenant;
  const existing = memorySolicitudes.get(memoryKey);
  if (existing) return existing;

  const created = {
    ...solicitud,
    id: solicitud.id ?? `sol-${Date.now()}`,
    creado_en: new Date().toISOString(),
  };
  memorySolicitudes.set(memoryKey, created);
  return created;
}

export async function saveInformeDb(
  informe: InformeRecord,
  accessToken?: string
): Promise<InformeRecord> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    const { data: inserted } = await client
      .from("informes")
      .insert({
        tenant_id: informe.tenant_id,
        predio_id: informe.predio_id ?? null,
        solicitud_id: informe.solicitud_id ?? null,
        tipo_lente: informe.tipo_lente ?? "agro",
        contenido: informe.contenido,
      })
      .select()
      .single();

    if (inserted) {
      if (informe.solicitud_id) {
        await client
          .from("solicitudes_analisis")
          .update({ resultado_informe_id: inserted.id })
          .eq("id", informe.solicitud_id)
          .eq("tenant_id", informe.tenant_id);
      }
      return inserted as InformeRecord;
    }
  }

  const created = {
    ...informe,
    id: informe.id ?? `inf-${Date.now()}`,
    fecha_generacion: new Date().toISOString(),
  };
  memoryInformes.set(created.id, created);
  return created;
}

export async function saveMedicionesDb(
  medicionesList: MedicionRecord[],
  accessToken?: string
): Promise<void> {
  if (medicionesList.length === 0) return;
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    await client.from("mediciones").insert(
      medicionesList.map(m => ({
        tenant_id: m.tenant_id,
        predio_id: m.predio_id,
        solicitud_id: m.solicitud_id ?? null,
        satelite: m.satelite,
        variable: m.variable,
        valor: m.valor,
        unidad: m.unidad ?? null,
        fecha_adquisicion: m.fecha_adquisicion,
      }))
    );
    return;
  }

  memoryMediciones.push(...medicionesList);
}

export async function recordConsumoDb(
  tenantId: string,
  hectaresProcessed: number,
  accessToken?: string
): Promise<void> {
  const client = getSupabaseUserClient(accessToken);
  const todayStr = new Date().toISOString().split("T")[0];

  if (client) {
    await client.from("consumo").insert({
      tenant_id: tenantId,
      fecha: todayStr,
      ha_procesadas: hectaresProcessed,
      unidades_procesamiento_usadas: hectaresProcessed * 1.2,
    });
    return;
  }

  memoryConsumo.push({
    tenant_id: tenantId,
    fecha: todayStr,
    ha_procesadas: hectaresProcessed,
  });
}

export async function writeWorkflowLogDb(
  tenantId: string,
  workflowNombre: string,
  estado: "exitoso" | "fallido",
  mensajeError?: string | null,
  payload?: any,
  accessToken?: string
): Promise<void> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    await client.from("workflow_logs").insert({
      tenant_id: tenantId,
      workflow_nombre: workflowNombre,
      estado,
      mensaje_error: mensajeError ?? null,
      payload: payload ?? {},
    });
    return;
  }

  memoryWorkflowLogs.push({
    tenant_id: tenantId,
    workflow_nombre: workflowNombre,
    estado,
    mensaje_error: mensajeError,
    payload,
  });
}

export async function listReportsDb(
  tenantId: string,
  filters?: { search?: string; status?: string },
  accessToken?: string
): Promise<ReportRecord[]> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    let query = client
      .from("informes")
      .select("*, solicitudes_analisis(*)")
      .eq("tenant_id", tenantId);

    const { data } = await query;
    if (data && data.length > 0) {
      return data.map(mapInformeToReportRecord);
    }
  }

  // Fallback en memoria filtrado por tenantId
  return Array.from(memoryInformes.values())
    .filter(inf => inf.tenant_id === tenantId)
    .map(mapInformeToReportRecord);
}

export async function getReportByIdDb(
  tenantId: string,
  id: string,
  accessToken?: string
): Promise<ReportRecord | null> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    const { data } = await client
      .from("informes")
      .select("*, solicitudes_analisis(*)")
      .eq("tenant_id", tenantId)
      .or(`id.eq.${id},solicitud_id.eq.${id}`)
      .maybeSingle();

    if (data) {
      return mapInformeToReportRecord(data);
    }
    return null;
  }

  // Fallback en memoria
  const inf = Array.from(memoryInformes.values()).find(i => i.tenant_id === tenantId && (i.id === id || i.solicitud_id === id));
  if (inf) {
    return mapInformeToReportRecord(inf);
  }
  return null;
}
