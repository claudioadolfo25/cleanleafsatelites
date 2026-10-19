import { getSupabaseAdminClient } from "../admin/supabase-client";
import { assertTransition, type AnalysisStatus } from "../../shared/analysis-state";
import { buildAnalysisReport, MockCopernicusProvider, type EarthObservationProvider } from "../../shared/observation-provider";
import { interpretMeasurement } from "../../shared/interpretation";
import { computeBBox, computePolygonAreaHa, type GeoJSONGeometry } from "../geometry";
import {
  copernicusCDSEProvider,
  FallbackObservationProvider,
  isCopernicusLiveEnabled,
  SyntheticCopernicusProvider,
} from "../copernicus";
import {
  getPendingSolicitudesDb,
  getPredioByIdDb,
  recordConsumoDb,
  saveInformeDb,
  saveMedicionesDb,
  updateSolicitudStateDb,
  writeWorkflowLogDb,
  type SolicitudRecord,
} from "../db/repository";

const copernicusMode = process.env.COPERNICUS_MODE ?? "synthetic";
const copernicusProdPolicy = process.env.COPERNICUS_PROD_POLICY ?? "synthetic_demo_only";
const isTestRuntime = process.env.NODE_ENV === "test";
const isDemoMode = process.env.DEMO_MODE === "true" || copernicusProdPolicy === "synthetic_demo_only";

const copernicusLiveEnabled =
  copernicusMode === "live" &&
  isCopernicusLiveEnabled(process.env, copernicusCDSEProvider.getTokenManager());

const syntheticProvider = new SyntheticCopernicusProvider(
  "Modo demostración o sintético activo."
);

// Con COPERNICUS_PROD_POLICY=live, eliminar FallbackObservationProvider del camino de producción:
// si CDSE falla tras los reintentos, la solicitud queda en error_final.
// El proveedor sintético solo se usa con DEMO_MODE=true o policy synthetic_demo_only.
export const workerObservationProvider: EarthObservationProvider = isTestRuntime
  ? new MockCopernicusProvider()
  : copernicusLiveEnabled
  ? copernicusCDSEProvider
  : syntheticProvider;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processSolicitud(
  solicitud: SolicitudRecord,
  accessToken?: string
): Promise<{ success: boolean; estado: string; error?: string }> {
  const tenantId = solicitud.tenant_id;
  const solicitudId = solicitud.id!;

  try {
    // 1. Transición: pendiente -> en_cola
    await updateSolicitudStateDb(tenantId, solicitudId, "en_cola", null, accessToken);
    await writeWorkflowLogDb(
      tenantId,
      "processSolicitud",
      "exitoso",
      null,
      { solicitudId, estado: "en_cola" },
      accessToken
    );

    // 2. Transición: en_cola -> procesando
    await updateSolicitudStateDb(tenantId, solicitudId, "procesando", null, accessToken);
    await writeWorkflowLogDb(
      tenantId,
      "processSolicitud",
      "exitoso",
      null,
      { solicitudId, estado: "procesando" },
      accessToken
    );

    const firstSatellite = (solicitud.satelites_solicitados[0] ?? "sentinel-2") as any;
    const firstVariable = solicitud.variables_solicitadas[0] ?? "ndvi";

    // 3. Verificar si es Tier 3 (>5.000 ha): requiere revisión manual
    if (solicitud.tier === "tier3_regional") {
      await updateSolicitudStateDb(tenantId, solicitudId, "requiere_revision", "Solicitud regional de superficie superior a 5.000 ha retenida para evaluación administrativa manual.", accessToken);
      await writeWorkflowLogDb(
        tenantId,
        "processSolicitud",
        "exitoso",
        null,
        { solicitudId, estado: "requiere_revision" },
        accessToken
      );
      return { success: true, estado: "requiere_revision" };
    }

    // 4. Consultar caché o ejecutar consulta satelital con reintentos para 429 / 5xx
    const { generateCacheKey, evaluateDataQuality } = await import("./copernicus-policy-service");
    const { getObservationCacheDb, saveObservationCacheDb } = await import("../db/repository");

    const predioDb = solicitud.predio_id
      ? await getPredioByIdDb(tenantId, solicitud.predio_id, accessToken)
      : null;

    const geometryToUse = (predioDb?.geometria as GeoJSONGeometry) || (solicitud.geometria as GeoJSONGeometry);
    const derivedBBox = geometryToUse ? computeBBox(geometryToUse) : undefined;

    const queryReq = {
      predioId: solicitud.predio_id ?? "predio-default",
      satellite: firstSatellite,
      variable: firstVariable,
      tier: solicitud.tier,
      bbox: derivedBBox,
    };

    const cacheKey = generateCacheKey(queryReq);
    let result = await getObservationCacheDb(cacheKey, tenantId, accessToken);

    if (result) {
      await writeWorkflowLogDb(
        tenantId,
        "processSolicitud",
        "exitoso",
        null,
        { solicitudId, cacheHit: true, cacheKey },
        accessToken
      );
    }

    let lastError: Error | null = null;

    if (!result) {
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          result = await workerObservationProvider.query(queryReq);

          if (result) {
            // Evaluar calidad SCL si está disponible
            const sclPercentage = (result as any).valid_pixel_percentage ?? 0.85;
            const quality = evaluateDataQuality(sclPercentage);
            result.confidence_level = quality.confidence;
            if (quality.warningMessage) {
              result.quality_warning = quality.warningMessage;
            }

            // Persistir en observacion_cache para evitar llamadas redundantes a Copernicus CDSE
            await saveObservationCacheDb(cacheKey, result, 300, tenantId, accessToken);
            break;
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(`[Worker] Intento ${attempt}/${maxAttempts} falló para solicitud ${solicitudId}: ${lastError.message}`);

          if (attempt < maxAttempts) {
            const backoffMs = Math.pow(2, attempt) * 200;
            await delay(backoffMs);
          }
        }
      }
    }

    if (!result) {
      const errorMessage = lastError?.message || "Error al consultar proveedor satelital tras agotar reintentos";
      await updateSolicitudStateDb(tenantId, solicitudId, "error_final", errorMessage, accessToken);
      await writeWorkflowLogDb(
        tenantId,
        "processSolicitud",
        "fallido",
        errorMessage,
        { solicitudId, estado: "error_final", copernicusPolicy: copernicusProdPolicy },
        accessToken
      );
      // ¡IMPORTANTE! Las solicitudes fallidas NO registran consumo de hectáreas ni persisten filas sintéticas en modo live.
      return { success: false, estado: "error_final", error: errorMessage };
    }

    // 4. Invocar getIndexTimeSeries (o almacenamiento incremental de serie temporal) por predio y satélite
    const { saveObservacionesSerieDb, listObservacionesSerieDb, createAlertWithDeduplicationDb } = await import("../db/repository");
    const { interpretTimeSeries } = await import("../analysis/interpret");
    const { buildMultiVariableEvalscript } = await import("./copernicus-time-series-service");

    const requestedSatellites = solicitud.satelites_solicitados ?? [firstSatellite];
    const requestedVariables = solicitud.variables_solicitadas ?? [firstVariable];

    if (solicitud.predio_id && geometryToUse) {
      for (const sat of requestedSatellites) {
        const evalMeta = buildMultiVariableEvalscript(sat, requestedVariables);
        const acquisitionDate = (result as any).fecha ?? (result as any).acquired_at ?? new Date();
        const acquisitionIsoStr =
          acquisitionDate instanceof Date
            ? acquisitionDate.toISOString()
            : typeof acquisitionDate === "string"
            ? acquisitionDate
            : new Date().toISOString();

        const fromDateStr = new Date(new Date(acquisitionIsoStr).getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

        const pointsToSave = requestedVariables.map(v => {
          const isSynthetic = (result as any).data_source === "synthetic" || isDemoMode;
          const val = v === firstVariable ? result.valor : result.valor;
          return {
            tenant_id: tenantId,
            predio_id: solicitud.predio_id!,
            satelite: sat,
            variable: v,
            intervalo_desde: fromDateStr,
            intervalo_hasta: acquisitionIsoStr,
            valor: val,
            porcentaje_pixeles_validos: (result as any).valid_pixel_percentage ?? 0.85,
            nivel_confianza: result.confidence_level ?? "alta",
            evalscript_version: evalMeta.version,
            evalscript_hash: evalMeta.hash,
          };
        });

        await saveObservacionesSerieDb(pointsToSave, accessToken);
      }
    }

    const historySeries = solicitud.predio_id
      ? await listObservacionesSerieDb(tenantId, solicitud.predio_id, firstSatellite, firstVariable, accessToken)
      : [];

    const seriesForInterpret = historySeries.length > 0
      ? historySeries.map(s => ({
          valor: s.valor,
          porcentajePixelesValidos: s.porcentaje_pixeles_validos,
          nivelConfianza: s.nivel_confianza,
        }))
      : [
          {
            valor: result.valor,
            porcentajePixelesValidos: (result as any).valid_pixel_percentage ?? 0.85,
            nivelConfianza: result.confidence_level ?? "alta",
          },
        ];

    const interpretation = interpretTimeSeries(seriesForInterpret, "agricultura", firstVariable);

    // Si la regla agronómica gatilla alerta, guardarla en DB con deduplicación
    for (const alertToTrigger of interpretation.alertsTriggered) {
      if (solicitud.predio_id) {
        await createAlertWithDeduplicationDb(
          tenantId,
          {
            predio_id: solicitud.predio_id,
            tipo_alerta: alertToTrigger.titulo,
            valor_real: interpretation.valorActual,
            valor_umbral: null,
          },
          accessToken
        );
      }
    }

    // Generar Informe enriquecido con interpretación real
    const predioDbForReport = solicitud.predio_id
      ? await getPredioByIdDb(tenantId, solicitud.predio_id, accessToken)
      : null;

    const report = buildAnalysisReport({
      id: solicitudId,
      predioId: solicitud.predio_id ?? "predio-default",
      predioNombre: predioDbForReport?.nombre || "Predio",
      tier: solicitud.tier,
      measurement: result,
    });

    if (interpretation.status === "ok") {
      (report as any).interpretation = interpretation;
      (report as any).summary = interpretation.diagnostico;
      if (interpretation.recomendaciones.length > 0) {
        (report as any).recommendation = interpretation.recomendaciones[0].recomendacion;
      }
    } else {
      (report as any).summary = "datos insuficientes";
      (report as any).recommendation = "No es posible emitir una recomendación por baja confianza o falta de datos válidos.";
    }

    await saveInformeDb({
      tenant_id: tenantId,
      predio_id: solicitud.predio_id ?? null,
      solicitud_id: solicitudId,
      tipo_lente: "agro",
      contenido: report as any,
    }, accessToken);

    const acquisitionDate = (result as any).fecha ?? (result as any).acquired_at;
    const acquisitionIsoStr =
      acquisitionDate instanceof Date
        ? acquisitionDate.toISOString()
        : typeof acquisitionDate === "string"
        ? acquisitionDate
        : new Date().toISOString();

    await saveMedicionesDb([{
      tenant_id: tenantId,
      predio_id: solicitud.predio_id ?? "predio-default",
      solicitud_id: solicitudId,
      satelite: firstSatellite,
      variable: firstVariable,
      valor: result.valor,
      unidad: result.unidad,
      fecha_adquisicion: acquisitionIsoStr,
    }], accessToken);

    // 5. Determinar proveniencia y guardar escenas STAC de Copernicus
    const { getProvenance } = await import("./copernicus-scenes-service");
    const { saveEscenasAndProvenanceDb } = await import("../db/repository");
    const geometryToUseForProv = (predioDbForReport?.geometria as GeoJSONGeometry) || (solicitud.geometria as GeoJSONGeometry);
    const prov = await getProvenance(
      solicitudId,
      geometryToUseForProv,
      "2024-01-01T00:00:00Z",
      new Date().toISOString()
    );

    await saveEscenasAndProvenanceDb(
      tenantId,
      solicitudId,
      prov.scenes.map(s => ({
        id: s.id,
        satelite: s.satelite,
        producto: s.producto,
        fecha_sensado: s.fechaSensado,
        cobertura_nubes: s.coberturaNubes,
        baseline_procesamiento: s.baselineProcesamiento,
      })),
      accessToken
    );

    // 6. Registrar Consumo ÚNICAMENTE al completar con éxito
    await recordConsumoDb(tenantId, solicitud.superficie_ha, accessToken);

    // 6. Transición final -> completado
    await updateSolicitudStateDb(tenantId, solicitudId, "completado", null, accessToken);
    await writeWorkflowLogDb(
      tenantId,
      "processSolicitud",
      "exitoso",
      null,
      { solicitudId, estado: "completado" },
      accessToken
    );

    // Send completion notification if user ID available
    if (solicitud.solicitado_por) {
      const { sendEmailNotification } = await import("./notification-service");
      await sendEmailNotification(
        solicitud.solicitado_por,
        null,
        "analysis_completed",
        "Tu análisis satelital está listo",
        `El análisis para la solicitud ${solicitudId} ha sido procesado con éxito.`,
        accessToken
      );
    }

    return { success: true, estado: "completado" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await updateSolicitudStateDb(tenantId, solicitudId, "error_final", errorMessage, accessToken);
    await writeWorkflowLogDb(
      tenantId,
      "processSolicitud",
      "fallido",
      errorMessage,
      { solicitudId, estado: "error_final" },
      accessToken
    );
    return { success: false, estado: "error_final", error: errorMessage };
  }
}

export async function runWorkerIteration(accessToken?: string): Promise<number> {
  const pendingList = await getPendingSolicitudesDb(accessToken);
  if (pendingList.length === 0) return 0;

  for (const sol of pendingList) {
    await processSolicitud(sol, accessToken);
  }

  return pendingList.length;
}

export function startWorkerLoop(intervalMs = 2000): () => void {
  console.log("[Worker] Iniciando bucle de procesamiento de solicitudes...");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV !== "test") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to start analysis worker loop.");
  }
  let active = true;

  const loop = async () => {
    while (active) {
      try {
        const processed = await runWorkerIteration();
        if (processed > 0) {
          console.log(`[Worker] Procesadas ${processed} solicitudes pendientes.`);
        }
      } catch (err) {
        console.error("[Worker] Error en iteración de worker:", err);
      }
      await delay(intervalMs);
    }
  };

  loop();

  return () => {
    console.log("[Worker] Deteniendo bucle de worker...");
    active = false;
  };
}
