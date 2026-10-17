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
const isTestRuntime = process.env.NODE_ENV === "test";
const copernicusLiveEnabled =
  copernicusMode === "live" &&
  isCopernicusLiveEnabled(process.env, copernicusCDSEProvider.getTokenManager());

const syntheticProvider = new SyntheticCopernicusProvider(
  copernicusLiveEnabled
    ? "Fallback sintético preparado para errores de Copernicus CDSE."
    : "Copernicus CDSE solo se activa en staging autorizado con COPERNICUS_MODE=live y ambas credenciales."
);

export const workerObservationProvider: EarthObservationProvider = isTestRuntime
  ? new MockCopernicusProvider()
  : copernicusLiveEnabled
  ? new FallbackObservationProvider(copernicusCDSEProvider, syntheticProvider)
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
    let result = await getObservationCacheDb(cacheKey, accessToken);

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

            await saveObservationCacheDb(cacheKey, result, 300, accessToken);
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
        { solicitudId, estado: "error_final" },
        accessToken
      );
      // ¡IMPORTANTE! Las solicitudes fallidas NO registran consumo de hectáreas.
      return { success: false, estado: "error_final", error: errorMessage };
    }

    // 4. Generar Informe y guardar Mediciones
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
