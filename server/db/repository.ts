import type { PlanId } from "../../shared/plan-limits";
import type { ReportRecord } from "../../shared/report-catalog";
import type { AnalysisStatus } from "../../shared/analysis-state";
import type { SatelliteId } from "../../shared/satellite-catalog";
import { computePolygonAreaHa, type GeoJSONGeometry } from "../geometry";
import { getSupabaseUserClient } from "./supabase-client";
import { getSupabaseAdminClient } from "../admin/supabase-client";

export type PredioRecord = {
  id: string;
  tenant_id: string;
  nombre: string;
  geometria: GeoJSONGeometry;
  cultivo_o_uso?: string | null;
  comuna?: string | null;
  superficie_ha: number;
  creado_en?: string;
};

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

export type WorkflowLogRecord = {
  id?: string;
  tenant_id: string;
  workflow_nombre: string;
  estado: "exitoso" | "fallido";
  mensaje_error?: string | null;
  payload?: any;
  inicio_ejecucion?: string;
  fin_ejecucion?: string;
  creado_en?: string;
};

// Almacenamiento en memoria para fallback en entornos de prueba o locales sin conexión live
const memoryPredios = new Map<string, PredioRecord>();
const memorySolicitudes = new Map<string, SolicitudRecord>();
const memoryInformes = new Map<string, InformeRecord>();
const memoryMediciones: MedicionRecord[] = [];
const memoryConsumo: { tenant_id: string; fecha: string; ha_procesadas: number }[] = [];
const memoryWorkflowLogs: WorkflowLogRecord[] = [];

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

export async function listPrediosDb(
  tenantId: string,
  accessToken?: string
): Promise<PredioRecord[]> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    const { data } = await client
      .from("predios")
      .select("*")
      .eq("tenant_id", tenantId);

    if (data && data.length > 0) {
      return data.map(row => ({
        id: row.id,
        tenant_id: row.tenant_id,
        nombre: row.nombre,
        geometria: row.geometria,
        cultivo_o_uso: row.cultivo_o_uso,
        comuna: row.comuna,
        superficie_ha: Number(row.superficie_ha),
        creado_en: row.creado_en,
      }));
    }
  }

  return Array.from(memoryPredios.values()).filter(p => p.tenant_id === tenantId);
}

export async function getPredioByIdDb(
  tenantId: string,
  predioId: string,
  accessToken?: string
): Promise<PredioRecord | null> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    const { data } = await client
      .from("predios")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", predioId)
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        tenant_id: data.tenant_id,
        nombre: data.nombre,
        geometria: data.geometria,
        cultivo_o_uso: data.cultivo_o_uso,
        comuna: data.comuna,
        superficie_ha: Number(data.superficie_ha),
        creado_en: data.creado_en,
      };
    }
  }

  const p = memoryPredios.get(predioId);
  if (p && p.tenant_id === tenantId) {
    return p;
  }
  return null;
}

export async function createPredioDb(
  data: {
    tenant_id: string;
    nombre: string;
    geometria: GeoJSONGeometry;
    cultivo_o_uso?: string | null;
    comuna?: string | null;
  },
  accessToken?: string
): Promise<PredioRecord> {
  const superficieHa = computePolygonAreaHa(data.geometria);
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    const { data: inserted } = await client
      .from("predios")
      .insert({
        tenant_id: data.tenant_id,
        nombre: data.nombre,
        geometria: data.geometria,
        cultivo_o_uso: data.cultivo_o_uso ?? null,
        comuna: data.comuna ?? null,
        superficie_ha: superficieHa,
      })
      .select()
      .single();

    if (inserted) {
      return {
        id: inserted.id,
        tenant_id: inserted.tenant_id,
        nombre: inserted.nombre,
        geometria: inserted.geometria,
        cultivo_o_uso: inserted.cultivo_o_uso,
        comuna: inserted.comuna,
        superficie_ha: Number(inserted.superficie_ha),
        creado_en: inserted.creado_en,
      };
    }
  }

  const created: PredioRecord = {
    id: `predio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenant_id: data.tenant_id,
    nombre: data.nombre,
    geometria: data.geometria,
    cultivo_o_uso: data.cultivo_o_uso ?? null,
    comuna: data.comuna ?? null,
    superficie_ha: superficieHa,
    creado_en: new Date().toISOString(),
  };

  memoryPredios.set(created.id, created);
  return created;
}

export async function updatePredioDb(
  tenantId: string,
  predioId: string,
  data: Partial<{
    nombre: string;
    geometria: GeoJSONGeometry;
    cultivo_o_uso?: string | null;
    comuna?: string | null;
  }>,
  accessToken?: string
): Promise<PredioRecord | null> {
  const client = getSupabaseUserClient(accessToken);

  const updates: Record<string, any> = {};
  if (data.nombre !== undefined) updates.nombre = data.nombre;
  if (data.cultivo_o_uso !== undefined) updates.cultivo_o_uso = data.cultivo_o_uso;
  if (data.comuna !== undefined) updates.comuna = data.comuna;
  if (data.geometria) {
    updates.geometria = data.geometria;
    updates.superficie_ha = computePolygonAreaHa(data.geometria);
  }

  if (client) {
    const { data: updated } = await client
      .from("predios")
      .update(updates)
      .eq("tenant_id", tenantId)
      .eq("id", predioId)
      .select()
      .maybeSingle();

    if (updated) {
      return {
        id: updated.id,
        tenant_id: updated.tenant_id,
        nombre: updated.nombre,
        geometria: updated.geometria,
        cultivo_o_uso: updated.cultivo_o_uso,
        comuna: updated.comuna,
        superficie_ha: Number(updated.superficie_ha),
        creado_en: updated.creado_en,
      };
    }
  }

  const existing = memoryPredios.get(predioId);
  if (existing && existing.tenant_id === tenantId) {
    const updated = {
      ...existing,
      ...updates,
      superficie_ha: data.geometria ? computePolygonAreaHa(data.geometria) : existing.superficie_ha,
    };
    memoryPredios.set(predioId, updated);
    return updated;
  }

  return null;
}

export async function deletePredioDb(
  tenantId: string,
  predioId: string,
  accessToken?: string
): Promise<boolean> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    const { error, count } = await client
      .from("predios")
      .delete({ count: "exact" })
      .eq("tenant_id", tenantId)
      .eq("id", predioId);

    if (!error && (count ?? 0) > 0) return true;
  }

  const existing = memoryPredios.get(predioId);
  if (existing && existing.tenant_id === tenantId) {
    memoryPredios.delete(predioId);
    return true;
  }

  return false;
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

  prediosActivos = Array.from(memoryPredios.values()).filter(p => p.tenant_id === tenantId).length || 1;

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
  memorySolicitudes.set(created.id, created);
  return created;
}

export async function getSolicitudByIdDb(
  tenantId: string,
  id: string,
  accessToken?: string
): Promise<SolicitudRecord | null> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    const { data } = await client
      .from("solicitudes_analisis")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();

    if (data) return data as SolicitudRecord;
  }

  const sol = memorySolicitudes.get(id);
  if (sol && sol.tenant_id === tenantId) return sol;
  return null;
}

export async function getPendingSolicitudesDb(
  accessToken?: string
): Promise<SolicitudRecord[]> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    const { data } = await client
      .from("solicitudes_analisis")
      .select("*")
      .eq("estado", "pendiente")
      .order("creado_en", { ascending: true });

    if (data) return data as SolicitudRecord[];
  }

  return Array.from(memorySolicitudes.values()).filter(s => s.estado === "pendiente");
}

export async function updateSolicitudStateDb(
  tenantId: string,
  id: string,
  estado: string,
  mensajeError?: string | null,
  accessToken?: string
): Promise<void> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    await client
      .from("solicitudes_analisis")
      .update({
        estado,
        mensaje_error: mensajeError ?? null,
        actualizado_en: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("id", id);
  }

  const sol = memorySolicitudes.get(id);
  if (sol && sol.tenant_id === tenantId) {
    sol.estado = estado;
    sol.mensaje_error = mensajeError ?? null;
  }
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
    creado_en: new Date().toISOString(),
  });
}

export async function getWorkflowLogsDb(
  tenantId: string,
  accessToken?: string
): Promise<WorkflowLogRecord[]> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    const { data } = await client
      .from("workflow_logs")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("creado_en", { ascending: true });

    if (data) return data as WorkflowLogRecord[];
  }

  return memoryWorkflowLogs.filter(w => w.tenant_id === tenantId);
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

export type UserPreferencesRecord = {
  user_id: string;
  sector: string;
  necesidad: string;
  fuentes_activas: string[];
  actualizado_en?: string;
};

export type TenantSettingsRecord = {
  tenant_id: string;
  sector: string;
  necesidad: string;
  fuentes_activas: string[];
  actualizado_en?: string;
};

const memoryUserPreferences = new Map<string, UserPreferencesRecord>();
const memoryTenantSettings = new Map<string, TenantSettingsRecord>();

export async function getUserPreferencesDb(
  userId: string,
  accessToken?: string
): Promise<UserPreferencesRecord | null> {
  const client = getSupabaseUserClient(accessToken);
  if (client) {
    const { data } = await client
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      return {
        user_id: data.user_id,
        sector: data.sector,
        necesidad: data.necesidad,
        fuentes_activas: data.fuentes_activas,
        actualizado_en: data.actualizado_en,
      };
    }
  }

  return memoryUserPreferences.get(userId) ?? null;
}

export async function saveUserPreferencesDb(
  prefs: UserPreferencesRecord,
  accessToken?: string
): Promise<UserPreferencesRecord> {
  const client = getSupabaseUserClient(accessToken);
  const updated: UserPreferencesRecord = {
    ...prefs,
    actualizado_en: new Date().toISOString(),
  };

  if (client) {
    const { data } = await client
      .from("user_preferences")
      .upsert({
        user_id: prefs.user_id,
        sector: prefs.sector,
        necesidad: prefs.necesidad,
        fuentes_activas: prefs.fuentes_activas,
        actualizado_en: updated.actualizado_en,
      })
      .select()
      .single();

    if (data) {
      return {
        user_id: data.user_id,
        sector: data.sector,
        necesidad: data.necesidad,
        fuentes_activas: data.fuentes_activas,
        actualizado_en: data.actualizado_en,
      };
    }
  }

  memoryUserPreferences.set(prefs.user_id, updated);
  return updated;
}

export async function getTenantSettingsDb(
  tenantId: string,
  accessToken?: string
): Promise<TenantSettingsRecord | null> {
  const client = getSupabaseUserClient(accessToken);
  if (client) {
    const { data } = await client
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (data) {
      return {
        tenant_id: data.tenant_id,
        sector: data.sector,
        necesidad: data.necesidad,
        fuentes_activas: data.fuentes_activas,
        actualizado_en: data.actualizado_en,
      };
    }
  }

  return memoryTenantSettings.get(tenantId) ?? null;
}

export async function saveTenantSettingsDb(
  settings: TenantSettingsRecord,
  accessToken?: string
): Promise<TenantSettingsRecord> {
  const client = getSupabaseUserClient(accessToken);
  const updated: TenantSettingsRecord = {
    ...settings,
    actualizado_en: new Date().toISOString(),
  };

  if (client) {
    const { data } = await client
      .from("tenant_settings")
      .upsert({
        tenant_id: settings.tenant_id,
        sector: settings.sector,
        necesidad: settings.necesidad,
        fuentes_activas: settings.fuentes_activas,
        actualizado_en: updated.actualizado_en,
      })
      .select()
      .single();

    if (data) {
      return {
        tenant_id: data.tenant_id,
        sector: data.sector,
        necesidad: data.necesidad,
        fuentes_activas: data.fuentes_activas,
        actualizado_en: data.actualizado_en,
      };
    }
  }

  memoryTenantSettings.set(settings.tenant_id, updated);
  return updated;
}

export type TenantInfoRecord = {
  id: string;
  nombre: string;
  plan_id: string;
  estado: string;
  creado_en?: string;
};

const memoryTenants = new Map<string, TenantInfoRecord>();
const memoryApiKeyHashes = new Set<string>();

export async function createTenantDb(
  data: { nombre: string; plan_id: string },
  accessToken?: string
): Promise<TenantInfoRecord> {
  const client = getSupabaseUserClient(accessToken);
  const newTenant: TenantInfoRecord = {
    id: `tenant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nombre: data.nombre,
    plan_id: data.plan_id,
    estado: "trial",
    creado_en: new Date().toISOString(),
  };

  if (client) {
    const { data: inserted } = await client
      .from("tenants")
      .insert({
        id: newTenant.id,
        nombre: newTenant.nombre,
        plan_id: newTenant.plan_id,
        estado: newTenant.estado,
      })
      .select()
      .single();

    if (inserted) {
      return {
        id: inserted.id,
        nombre: inserted.nombre,
        plan_id: inserted.plan_id,
        estado: inserted.estado,
        creado_en: inserted.creado_en,
      };
    }
  }

  memoryTenants.set(newTenant.id, newTenant);
  return newTenant;
}

export async function saveApiKeyHashDb(
  data: { tenant_id: string; nombre: string; key_hash: string },
  accessToken?: string
): Promise<void> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    await client.from("api_keys").insert({
      tenant_id: data.tenant_id,
      nombre: data.nombre,
      key_hash: data.key_hash,
    });
    return;
  }

  memoryApiKeyHashes.add(data.key_hash);
}

export type AuditLogRecord = {
  id?: string;
  tenant_id: string;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  entity: string;
  payload?: Record<string, unknown>;
  ip_address?: string | null;
  created_at?: string;
};

const memoryAuditLogs: AuditLogRecord[] = [];

export async function createAuditLogDb(
  log: AuditLogRecord
): Promise<AuditLogRecord> {
  const created: AuditLogRecord = {
    ...log,
    id: log.id ?? `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  };

  const hasDbConfig = Boolean(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (hasDbConfig) {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client
        .from("audit_logs")
        .insert({
          tenant_id: log.tenant_id,
          user_id: log.user_id ?? null,
          user_email: log.user_email ?? null,
          action: log.action,
          entity: log.entity,
          payload: log.payload ?? {},
          ip_address: log.ip_address ?? null,
        })
        .select()
        .single();

      if (error) {
        console.error("[AuditLogWriteError] Database insert failed:", error.message);
        if (process.env.NODE_ENV !== "test") {
          throw new Error(`Audit log database write failed: ${error.message}`);
        }
      } else if (data) {
        return data as AuditLogRecord;
      }
    } catch (err) {
      console.error("[AuditLogWriteError] Exception during audit log write:", err);
      if (process.env.NODE_ENV !== "test") {
        throw err;
      }
    }
  }

  if (process.env.NODE_ENV === "test") {
    memoryAuditLogs.push(created);
    return created;
  }

  throw new Error("Audit log database write failed: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL not configured");
}

export async function listAuditLogsDb(
  filters?: { tenant_id?: string; action?: string; search?: string },
  accessToken?: string
): Promise<AuditLogRecord[]> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      let query = client.from("audit_logs").select("*").order("created_at", { ascending: false });
      if (filters?.tenant_id) query = query.eq("tenant_id", filters.tenant_id);
      if (filters?.action) query = query.eq("action", filters.action);

      const { data } = await query;
      if (data && data.length > 0) return data as AuditLogRecord[];
    } catch {
      // Fallback
    }
  }

  return memoryAuditLogs.filter(a => {
    if (filters?.tenant_id && a.tenant_id !== filters.tenant_id) return false;
    if (filters?.action && a.action !== filters.action) return false;
    return true;
  });
}

export async function listAllTenantsDb(
  accessToken?: string
): Promise<TenantInfoRecord[]> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      const { data } = await client.from("tenants").select("*");
      if (data && data.length > 0) return data as TenantInfoRecord[];
    } catch {
      // Fallback
    }
  }

  return Array.from(memoryTenants.values());
}

export async function updateTenantPlanDb(
  tenantId: string,
  planId: string,
  accessToken?: string
): Promise<boolean> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      const { error } = await client
        .from("tenants")
        .update({ plan_id: planId })
        .eq("id", tenantId);
      if (!error) return true;
    } catch {
      // Fallback
    }
  }

  const existing = memoryTenants.get(tenantId);
  if (existing) {
    existing.plan_id = planId;
  } else {
    memoryTenants.set(tenantId, {
      id: tenantId,
      nombre: `Tenant (${tenantId})`,
      plan_id: planId,
      estado: "activa",
    });
  }
  return true;
}

export async function listFailedSolicitudesDb(
  accessToken?: string
): Promise<SolicitudRecord[]> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      const { data } = await client
        .from("solicitudes_analisis")
        .select("*")
        .in("estado", ["error_final", "error_reintentable", "requiere_revision"])
        .order("creado_en", { ascending: false });

      if (data) return data as SolicitudRecord[];
    } catch {
      // Fallback
    }
  }

  return Array.from(memorySolicitudes.values()).filter(s =>
    ["error_final", "error_reintentable", "requiere_revision"].includes(s.estado)
  );
}

const memoryObservationCache = new Map<string, { datos: any; expira_en: string; tenant_id: string }>();

export async function getObservationCacheDb(
  cacheKey: string,
  tenantId: string,
  accessToken?: string
): Promise<any | null> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      const { data } = await client
        .from("observation_cache")
        .select("datos, expira_en")
        .eq("cache_key", cacheKey)
        .eq("tenant_id", tenantId)
        .gte("expira_en", new Date().toISOString())
        .maybeSingle();

      if (data) return data.datos;
    } catch {
      // Fallback
    }
  }

  const cached = memoryObservationCache.get(`${tenantId}:${cacheKey}`);
  if (cached && new Date(cached.expira_en).getTime() > Date.now()) {
    return cached.datos;
  }
  return null;
}

export async function saveObservationCacheDb(
  cacheKey: string,
  data: any,
  ttlSeconds = 300,
  tenantId: string,
  accessToken?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      await client.from("observation_cache").upsert({
        cache_key: cacheKey,
        tenant_id: tenantId,
        satelite: data.satelite ?? "sentinel-2",
        variable: data.variable ?? "ndvi",
        datos: data,
        expira_en: expiresAt,
      });
      return;
    } catch {
      // Fallback
    }
  }

  memoryObservationCache.set(`${tenantId}:${cacheKey}`, { datos: data, expira_en: expiresAt, tenant_id: tenantId });
}

export type ObservacionesSerieRecord = {
  id?: string;
  tenant_id: string;
  predio_id: string;
  satelite: string;
  variable: string;
  intervalo_desde: string;
  intervalo_hasta: string;
  valor: number | null;
  porcentaje_pixeles_validos?: number;
  nivel_confianza?: string;
  evalscript_version?: string;
  evalscript_hash?: string;
  creado_en?: string;
};

const memoryObservacionesSerie: ObservacionesSerieRecord[] = [];

export async function listObservacionesSerieDb(
  tenantId: string,
  predioId: string,
  satelite: string,
  variable: string,
  accessToken?: string
): Promise<ObservacionesSerieRecord[]> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      const { data } = await client
        .from("observaciones_serie")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("predio_id", predioId)
        .eq("satelite", satelite)
        .eq("variable", variable)
        .order("intervalo_desde", { ascending: true });

      if (data && data.length > 0) return data as ObservacionesSerieRecord[];
    } catch {
      // Fallback
    }
  }

  return memoryObservacionesSerie.filter(
    s => s.tenant_id === tenantId && s.predio_id === predioId && s.satelite === satelite && s.variable === variable
  );
}

export async function saveObservacionesSerieDb(
  items: ObservacionesSerieRecord[],
  accessToken?: string
): Promise<void> {
  if (items.length === 0) return;
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      await client.from("observaciones_serie").upsert(
        items.map(item => ({
          tenant_id: item.tenant_id,
          predio_id: item.predio_id,
          satelite: item.satelite,
          variable: item.variable,
          intervalo_desde: item.intervalo_desde,
          intervalo_hasta: item.intervalo_hasta,
          valor: item.valor,
          porcentaje_pixeles_validos: item.porcentaje_pixeles_validos ?? 1.0,
          nivel_confianza: item.nivel_confianza ?? "alta",
          evalscript_version: item.evalscript_version ?? "v1.0.0",
          evalscript_hash: item.evalscript_hash,
        })),
        { onConflict: "tenant_id,predio_id,satelite,variable,intervalo_desde,intervalo_hasta" }
      );
      return;
    } catch {
      // Fallback
    }
  }

  for (const item of items) {
    const existingIndex = memoryObservacionesSerie.findIndex(
      s =>
        s.tenant_id === item.tenant_id &&
        s.predio_id === item.predio_id &&
        s.satelite === item.satelite &&
        s.variable === item.variable &&
        s.intervalo_desde === item.intervalo_desde &&
        s.intervalo_hasta === item.intervalo_hasta
    );
    if (existingIndex >= 0) {
      memoryObservacionesSerie[existingIndex] = { ...memoryObservacionesSerie[existingIndex], ...item };
    } else {
      memoryObservacionesSerie.push({ ...item, id: `obs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
    }
  }
}

export type EscenaRecord = {
  id: string;
  tenant_id?: string;
  satelite: string;
  producto: string;
  fecha_sensado: string;
  cobertura_nubes?: number | null;
  baseline_procesamiento?: string | null;
  creado_en?: string;
};

const memoryEscenas = new Map<string, EscenaRecord>();
const memoryInformeEscenas: { informe_id: string; escena_id: string; tenant_id: string }[] = [];

export async function saveEscenasAndProvenanceDb(
  tenantId: string,
  informeId: string,
  escenas: EscenaRecord[],
  accessToken?: string
): Promise<void> {
  if (escenas.length === 0) return;
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      await client.from("escenas").upsert(
        escenas.map(e => ({
          id: e.id,
          tenant_id: tenantId,
          satelite: e.satelite,
          producto: e.producto,
          fecha_sensado: e.fecha_sensado,
          cobertura_nubes: e.cobertura_nubes ?? null,
          baseline_procesamiento: e.baseline_procesamiento ?? null,
        }))
      );

      await client.from("informe_escenas").upsert(
        escenas.map(e => ({
          informe_id: informeId,
          escena_id: e.id,
          tenant_id: tenantId,
        }))
      );
      return;
    } catch {
      // Fallback
    }
  }

  for (const e of escenas) {
    memoryEscenas.set(e.id, e);
    if (!memoryInformeEscenas.some(ie => ie.informe_id === informeId && ie.escena_id === e.id)) {
      memoryInformeEscenas.push({ informe_id: informeId, escena_id: e.id, tenant_id: tenantId });
    }
  }
}

export async function listEscenasForInformeDb(
  tenantId: string,
  informeId: string,
  accessToken?: string
): Promise<EscenaRecord[]> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      const { data } = await client
        .from("informe_escenas")
        .select("escena_id, escenas(*)")
        .eq("tenant_id", tenantId)
        .eq("informe_id", informeId);

      if (data && data.length > 0) {
        return data.map((row: any) => row.escenas).filter(Boolean);
      }
    } catch {
      // Fallback
    }
  }

  const escenaIds = memoryInformeEscenas
    .filter(ie => ie.tenant_id === tenantId && ie.informe_id === informeId)
    .map(ie => ie.escena_id);

  return escenaIds.map(id => memoryEscenas.get(id)).filter((e): e is EscenaRecord => Boolean(e));
}

export type AlertaRecord = {
  id?: string;
  tenant_id: string;
  predio_id: string;
  tipo_alerta: string;
  enviada?: boolean;
  valor_real?: number | null;
  valor_umbral?: number | null;
  fecha_activacion?: string;
};

const memoryAlertas = new Map<string, AlertaRecord>();

export async function createAlertWithDeduplicationDb(
  tenantId: string,
  alertData: {
    predio_id: string;
    tipo_alerta: string;
    valor_real?: number | null;
    valor_umbral?: number | null;
  },
  accessToken?: string
): Promise<{ inserted: boolean; alert: AlertaRecord }> {
  const client = getSupabaseUserClient(accessToken);

  if (client) {
    try {
      // 1. Verificar si ya existe una alerta abierta no enviada del mismo tipo y predio
      const { data: existing } = await client
        .from("alertas")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("predio_id", alertData.predio_id)
        .eq("tipo_alerta", alertData.tipo_alerta)
        .eq("enviada", false)
        .maybeSingle();

      if (existing) {
        return { inserted: false, alert: existing as AlertaRecord };
      }

      // 2. Insertar nueva alerta
      const { data: inserted } = await client
        .from("alertas")
        .insert({
          tenant_id: tenantId,
          predio_id: alertData.predio_id,
          tipo_alerta: alertData.tipo_alerta,
          valor_real: alertData.valor_real ?? null,
          valor_umbral: alertData.valor_umbral ?? null,
          enviada: false,
        })
        .select()
        .single();

      if (inserted) {
        return { inserted: true, alert: inserted as AlertaRecord };
      }
    } catch {
      // Fallback
    }
  }

  // Fallback en memoria
  const deduplicationKey = `${tenantId}:${alertData.predio_id}:${alertData.tipo_alerta}`;
  const existing = Array.from(memoryAlertas.values()).find(
    a => a.tenant_id === tenantId && a.predio_id === alertData.predio_id && a.tipo_alerta === alertData.tipo_alerta && !a.enviada
  );

  if (existing) {
    return { inserted: false, alert: existing };
  }

  const createdAlert: AlertaRecord = {
    id: `alt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenant_id: tenantId,
    predio_id: alertData.predio_id,
    tipo_alerta: alertData.tipo_alerta,
    valor_real: alertData.valor_real ?? null,
    valor_umbral: alertData.valor_umbral ?? null,
    enviada: false,
    fecha_activacion: new Date().toISOString(),
  };

  memoryAlertas.set(createdAlert.id!, createdAlert);
  return { inserted: true, alert: createdAlert };
}

export async function getDashboardDataDb(
  tenantId: string,
  accessToken?: string
) {
  const client = getSupabaseUserClient(accessToken);

  // 1. Obtener predios del tenant
  const userPredios = await listPrediosDb(tenantId, accessToken);
  const usageAndLimits = await getTenantUsageAndLimits(tenantId, accessToken);

  let liveMediciones: MedicionRecord[] = [];
  let liveAlertas: any[] = [];
  let dataSource: "cdse_live" | "synthetic" = "synthetic";

  if (client) {
    try {
      const { data: mData } = await client
        .from("mediciones")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("fecha_adquisicion", { ascending: false });

      if (mData && mData.length > 0) {
        liveMediciones = mData as MedicionRecord[];
        dataSource = "cdse_live";
      }

      const { data: aData } = await client
        .from("alertas")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("fecha_activacion", { ascending: false });

      if (aData) {
        liveAlertas = aData;
      }
    } catch {
      // Fallback
    }
  }

  if (liveMediciones.length === 0) {
    liveMediciones = memoryMediciones.filter(m => m.tenant_id === tenantId);
  }

  // 2. Calcular hectáreas totales y vigor promedio ponderado por hectárea
  const totalHectareas = userPredios.reduce((acc, p) => acc + p.superficie_ha, 0);
  let totalWeightedNdviProduct = 0;

  const prediosMapped = userPredios.map(p => {
    const pMediciones = liveMediciones.filter(m => m.predio_id === p.id && m.variable.toLowerCase() === "ndvi");
    const latestNdvi = pMediciones[0]?.valor ?? 0.65;
    const previousNdvi = pMediciones[1]?.valor ?? latestNdvi - 0.02;
    const delta = Number((latestNdvi - previousNdvi).toFixed(2));

    totalWeightedNdviProduct += latestNdvi * p.superficie_ha;

    return {
      id: p.id,
      nombre: p.nombre,
      comuna: p.comuna || "Sin comuna",
      hectareas: p.superficie_ha,
      ndvi: Number(latestNdvi.toFixed(2)),
      estado: latestNdvi >= 0.6 ? "Óptimo" : latestNdvi >= 0.4 ? "Revisar" : "Atención",
      delta,
      geometria: p.geometria,
    };
  });

  const weightedNdvi = totalHectareas > 0 ? Number((totalWeightedNdviProduct / totalHectareas).toFixed(2)) : 0;

  // Serie temporal para gráficos
  const s2Series = liveMediciones
    .filter(m => m.satelite === "sentinel-2")
    .slice(0, 10)
    .reverse()
    .map(m => ({
      fecha: new Date(m.fecha_adquisicion).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
      valor: m.valor,
    }));

  const s1Series = liveMediciones
    .filter(m => m.satelite === "sentinel-1")
    .slice(0, 10)
    .reverse()
    .map(m => ({
      fecha: new Date(m.fecha_adquisicion).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
      valor: m.valor,
    }));

  const lastMeasurement = liveMediciones[0]?.fecha_adquisicion;
  const lastMeasurementFormatted = lastMeasurement
    ? new Date(lastMeasurement).toLocaleDateString("es-CL", { day: "numeric", month: "short" })
    : "Sin lecturas";

  return {
    tenant: {
      id: tenantId,
      nombre: `Organización (${tenantId})`,
      vertical: "agricultura" as const,
      plan: usageAndLimits.planId === "piloto" ? "Plan Piloto" : usageAndLimits.planId === "regional_pyme" ? "Plan Regional PYME" : "Plan Región Completa",
      usoHa: usageAndLimits.haMesUsadas,
      limiteHa: usageAndLimits.planId === "piloto" ? 100 : usageAndLimits.planId === "regional_pyme" ? 1000 : 100000,
    },
    metrics: {
      weightedNdvi,
      weightedNdviFormatted: weightedNdvi > 0 ? weightedNdvi.toFixed(2).replace(".", ",") : "0,00",
      deltaNdvi: 0.04,
      deltaFormatted: "+0,04 vs. quincena anterior",
      totalPredios: userPredios.length,
      totalHectareas,
      actionRequiredCount: liveAlertas.filter(a => a.enviada === false).length,
      lastMeasurementFormatted,
    },
    predios: prediosMapped,
    measurements: {
      "sentinel-2": s2Series.length > 0 ? s2Series : [
        { fecha: "08 Ago", valor: 0.49 }, { fecha: "13 Ago", valor: 0.53 }, { fecha: "18 Ago", valor: 0.58 },
        { fecha: "23 Ago", valor: 0.55 }, { fecha: "28 Ago", valor: 0.61 }, { fecha: "02 Sep", valor: 0.64 }, { fecha: "07 Sep", valor: 0.68 },
      ],
      "sentinel-1": s1Series.length > 0 ? s1Series : [
        { fecha: "08 Ago", valor: -18.4 }, { fecha: "13 Ago", valor: -17.8 }, { fecha: "18 Ago", valor: -19.1 },
        { fecha: "23 Ago", valor: -18.7 }, { fecha: "28 Ago", valor: -17.9 }, { fecha: "02 Sep", valor: -17.4 }, { fecha: "07 Sep", valor: -16.8 },
      ],
    },
    alerts: liveAlertas.map(a => ({
      id: a.id,
      nivel: a.valor_real && a.valor_umbral && a.valor_real < a.valor_umbral ? "atención" as const : "info" as const,
      titulo: a.tipo_alerta || "Alerta de monitoreo",
      detalle: `Valor observado: ${a.valor_real ?? "N/A"}`,
      accion: "Ver zona",
    })),
    dataSource,
  };
}
