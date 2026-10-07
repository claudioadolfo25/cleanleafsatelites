import { getCopernicusAccessToken, invalidateCopernicusToken } from "./copernicus-auth";
import { supabaseAdmin } from "../admin/supabase-client";
import axios from "axios";

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface AnalysisRequestParams {
  predioId: string;
  tenantId: string;
  polygon: GeoJsonPolygon;
  bbox: [number, number, number, number]; // [minX, minY, maxX, maxY]
  fromDate: string; // ISO String YYYY-MM-DD
  toDate: string; // ISO String YYYY-MM-DD
  superficieHa: number;
  tier?: "tier1_predio" | "tier2_extendido" | "tier3_regional";
  idempotencyKey?: string;
  maxCloudCoverage?: number;
  minValidPixelRatio?: number; // Default 0.30 (30% valid pixels required for HIGH confidence)
}

export interface StatisticalResult {
  mean: number;
  min: number;
  max: number;
  stDev: number;
  sampleCount: number;
  noDataCount: number;
  validPixelRatio: number;
  date: string;
}

export interface OrchestrationResult {
  status: "SUCCESS" | "LOW_CONFIDENCE" | "NO_DATA" | "RATE_LIMITED" | "ERROR";
  reportType: "s2-ndvi";
  predioId: string;
  stats?: StatisticalResult;
  informeId?: string;
  solicitudId?: string;
  message?: string;
  cached?: boolean;
}

/**
 * Copernicus CDSE Pipeline Orchestrator (Catalog API -> Statistical API -> Supabase Cache & Reports)
 */
export async function executeNdviAnalysis(
  params: AnalysisRequestParams
): Promise<OrchestrationResult> {
  const maxCloud = params.maxCloudCoverage ?? 20;
  const minValidPixelRatio = params.minValidPixelRatio ?? 0.3; // 30% threshold
  const tier = params.tier || "tier1_predio";
  const idempotencyKey =
    params.idempotencyKey || `s2-ndvi-${params.predioId}-${params.fromDate}-${params.toDate}`;

  // 1. Check Supabase Cache (Mediciones / Informes)
  try {
    const { data: cachedMedicion } = await supabaseAdmin
      .from("mediciones")
      .select("valor, fecha_adquisicion, solicitud_id")
      .eq("tenant_id", params.tenantId)
      .eq("predio_id", params.predioId)
      .eq("satelite", "sentinel-2")
      .eq("variable", "ndvi_mean")
      .gte("fecha_adquisicion", `${params.fromDate}T00:00:00Z`)
      .lte("fecha_adquisicion", `${params.toDate}T23:59:59Z`)
      .order("fecha_adquisicion", { ascending: false })
      .limit(1)
      .single();

    if (cachedMedicion) {
      return {
        status: "SUCCESS",
        reportType: "s2-ndvi",
        predioId: params.predioId,
        stats: {
          mean: Number(cachedMedicion.valor),
          min: 0,
          max: 0,
          stDev: 0,
          sampleCount: 1,
          noDataCount: 0,
          validPixelRatio: 1.0,
          date: cachedMedicion.fecha_adquisicion,
        },
        cached: true,
      };
    }
  } catch (_e) {
    // Ignore cache lookup errors and proceed
  }

  // 2. Fetch OAuth Token
  let token: string;
  try {
    token = await getCopernicusAccessToken();
  } catch (err: any) {
    return {
      status: "ERROR",
      reportType: "s2-ndvi",
      predioId: params.predioId,
      message: err.message,
    };
  }

  // 3. Step A: Catalog API Search (STAC with CQL2 Cloud Cover Filter)
  const catalogUrl = "https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search";
  const catalogPayload = {
    collections: ["sentinel-2-l2a"],
    datetime: `${params.fromDate}T00:00:00Z/${params.toDate}T23:59:59Z`,
    bbox: params.bbox,
    filter: `eo:cloud_cover <= ${maxCloud}`,
    "filter-lang": "cql2-text",
    limit: 10,
  };

  let catalogData: any;
  try {
    const response = await axios.post(catalogUrl, catalogPayload, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 12000,
    });
    catalogData = response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      invalidateCopernicusToken();
    }
    if (error.response?.status === 429) {
      return {
        status: "RATE_LIMITED",
        reportType: "s2-ndvi",
        predioId: params.predioId,
        message: "Copernicus CDSE rate limit exceeded (429). Please retry shortly.",
      };
    }
    return {
      status: "ERROR",
      reportType: "s2-ndvi",
      predioId: params.predioId,
      message: `Catalog API Error: ${error.response?.data?.error?.message || error.message}`,
    };
  }

  // Check scene availability
  if (!catalogData?.features || catalogData.features.length === 0) {
    return {
      status: "NO_DATA",
      reportType: "s2-ndvi",
      predioId: params.predioId,
      message: `No satellite imagery available with cloud coverage <= ${maxCloud}% for the selected dates.`,
    };
  }

  // 4. Step B: Statistical API with SCL Cloud Masking
  // Calculate grid resolution from parcel surface area (~100 pixels per hectare)
  const gridResolution = Math.max(10, Math.round(Math.sqrt((params.superficieHa * 10000) / 100)));

  const statsUrl = "https://sh.dataspace.copernicus.eu/api/v1/statistics";
  const statsPayload = {
    input: {
      bounds: {
        geometry: params.polygon,
        properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
      },
      data: [
        {
          type: "S2L2A",
          dataFilter: {
            timeRange: {
              from: `${params.fromDate}T00:00:00Z`,
              to: `${params.toDate}T23:59:59Z`,
            },
            maxCloudCoverage: maxCloud,
          },
        },
      ],
    },
    aggregation: {
      timeRange: {
        from: `${params.fromDate}T00:00:00Z`,
        to: `${params.toDate}T23:59:59Z`,
      },
      aggregationInterval: { of: "P1D" },
      // SCL (Scene Classification Layer) Cloud Masking:
      // Excludes SCL 3 (Cloud Shadow), 8 (Cloud Medium Prob), 9 (Cloud High Prob), 10 (Thin Cirrus), 11 (Snow/Ice)
      evalscript:
        '//VERSION=3\nfunction setup() { return { input: [{ bands: ["B04", "B08", "SCL", "dataMask"] }], output: [{ id: "ndvi", bands: 1 }, { id: "dataMask", bands: 1 }] }; }\nfunction evaluatePixel(sample) { if (sample.dataMask === 0 || [3, 8, 9, 10, 11].includes(sample.SCL)) { return { ndvi: [0], dataMask: [0] }; } let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04); return { ndvi: [ndvi], dataMask: [1] }; }',
      width: gridResolution,
      height: gridResolution,
    },
  };

  let statsData: any;
  try {
    const response = await axios.post(statsUrl, statsPayload, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: 15000,
    });
    statsData = response.data;
  } catch (error: any) {
    if (error.response?.status === 429) {
      return {
        status: "RATE_LIMITED",
        reportType: "s2-ndvi",
        predioId: params.predioId,
        message: "Copernicus CDSE rate limit exceeded (429) during statistical processing.",
      };
    }
    return {
      status: "ERROR",
      reportType: "s2-ndvi",
      predioId: params.predioId,
      message: `Statistical API Error: ${error.response?.data?.error?.message || error.message}`,
    };
  }

  // Parse statistical response
  const interval = statsData?.data?.[0]?.outputs?.ndvi?.bands?.B0?.stats;
  if (!interval || interval.sampleCount === 0) {
    return {
      status: "NO_DATA",
      reportType: "s2-ndvi",
      predioId: params.predioId,
      message: "No valid clear NDVI pixels were found inside the parcel polygon after cloud masking.",
    };
  }

  const sampleCount = interval.sampleCount || 0;
  const noDataCount = interval.noDataCount || 0;
  const validPixels = Math.max(0, sampleCount - noDataCount);
  const validPixelRatio = sampleCount > 0 ? Number((validPixels / sampleCount).toFixed(4)) : 0;

  // Determine status based on validPixelRatio threshold
  let status: "SUCCESS" | "LOW_CONFIDENCE" | "NO_DATA" = "SUCCESS";
  if (validPixels === 0 || isNaN(interval.mean)) {
    return {
      status: "NO_DATA",
      reportType: "s2-ndvi",
      predioId: params.predioId,
      message: "No valid clear NDVI pixels were found inside parcel after SCL cloud masking.",
    };
  } else if (validPixelRatio < minValidPixelRatio) {
    status = "LOW_CONFIDENCE";
  }

  const resultStats: StatisticalResult = {
    mean: Number(interval.mean.toFixed(4)),
    min: Number(interval.min.toFixed(4)),
    max: Number(interval.max.toFixed(4)),
    stDev: Number(interval.stDev.toFixed(4)),
    sampleCount: sampleCount,
    noDataCount: noDataCount,
    validPixelRatio: validPixelRatio,
    date: params.toDate,
  };

  // 5. Persist Request, Report, and Measurement to Supabase (Negative NDVI or valid mean is persisted)
  let createdInformeId: string | undefined;
  let createdSolicitudId: string | undefined;

  try {
    // Insert Solicitud Analisis matching schema constraints
    const { data: solData } = await supabaseAdmin
      .from("solicitudes_analisis")
      .insert({
        tenant_id: params.tenantId,
        predio_id: params.predioId,
        geometria: params.polygon,
        superficie_ha: params.superficieHa,
        tier: tier,
        satelites_solicitados: ["sentinel-2"],
        variables_solicitadas: ["ndvi"],
        motor_usado: "statistical_api",
        estado: status === "SUCCESS" ? "completado" : "requiere_revision",
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    createdSolicitudId = solData?.id;

    // Insert Report record into `informes` table
    const { data: infData } = await supabaseAdmin
      .from("informes")
      .insert({
        tenant_id: params.tenantId,
        predio_id: params.predioId,
        solicitud_id: createdSolicitudId,
        tipo_lente: "agro",
        contenido: {
          reportType: "s2-ndvi",
          statistics: resultStats,
          status: status,
        },
      })
      .select("id")
      .single();

    createdInformeId = infData?.id;

    if (createdInformeId && createdSolicitudId) {
      await supabaseAdmin
        .from("solicitudes_analisis")
        .update({ resultado_informe_id: createdInformeId })
        .eq("id", createdSolicitudId);
    }

    // Insert numeric measurement into `mediciones` table
    await supabaseAdmin.from("mediciones").insert({
      tenant_id: params.tenantId,
      predio_id: params.predioId,
      solicitud_id: createdSolicitudId,
      satelite: "sentinel-2",
      variable: "ndvi_mean",
      valor: resultStats.mean,
      unidad: "index",
      fecha_adquisicion: `${params.toDate}T12:00:00Z`,
    });
  } catch (_e) {
    // Non-blocking database write error
  }

  return {
    status: status,
    reportType: "s2-ndvi",
    predioId: params.predioId,
    stats: resultStats,
    solicitudId: createdSolicitudId,
    informeId: createdInformeId,
    cached: false,
    message:
      status === "LOW_CONFIDENCE"
        ? `Low confidence result: only ${(validPixelRatio * 100).toFixed(1)}% of parcel pixels were clear of cloud/shadow.`
        : undefined,
  };
}
