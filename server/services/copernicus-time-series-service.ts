import { createHash } from "node:crypto";
import type { GeoJSONGeometry } from "../geometry";

export type TimeSeriesInterval = "P5D" | "P10D";

export type TimeSeriesPoint = {
  intervaloDesde: string;
  intervaloHasta: string;
  valor: number | null;
  status: "ok" | "sin_dato" | "baja_confianza";
  porcentajePixelesValidos: number;
  evalscriptVersion: string;
  evalscriptHash: string;
};

export function computeEvalscriptHash(evalscript: string): string {
  return createHash("sha256").update(evalscript).digest("hex").slice(0, 16);
}

export function isSstSupportedForSatellite(satellite: string): { supported: boolean; reason?: string } {
  return {
    supported: false,
    reason: "La variable sst no está disponible en el catálogo de Sentinel Hub en CDSE (SLSTR L2 WST no soportado) y no se simula.",
  };
}

export function buildMultiVariableEvalscript(satellite: string, variables: string[]): {
  evalscript: string;
  version: string;
  hash: string;
} {
  const version = "v1.0.0";
  let evalscript = "";

  if (satellite === "sentinel-2") {
    const outputs = variables.map((v, i) => `{ id: "${v}", bands: 1 }`).join(", ");
    evalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B04", "B05", "B08", "B11", "SCL", "dataMask"] }],
    output: [${outputs}]
  };
}
function evaluatePixel(samples) {
  if (samples.dataMask === 0 || samples.SCL === 3 || samples.SCL === 8 || samples.SCL === 9) {
    return { ${variables.map(v => `${v}: [0]`).join(", ")} };
  }
  var ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
  var ndre = (samples.B08 - samples.B05) / (samples.B08 + samples.B05);
  var ndmi = (samples.B08 - samples.B11) / (samples.B08 + samples.B11);
  return {
    ${variables.map(v => `${v}: [${v === "ndre" ? "ndre" : v === "ndmi" ? "ndmi" : "ndvi"}]`).join(",\n    ")}
  };
}`;
  } else {
    evalscript = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["VV", "VH", "dataMask"] }],
    output: [{ id: "sigma0_vv", bands: 1 }]
  };
}
function evaluatePixel(samples) {
  return { sigma0_vv: [10 * Math.log10(samples.VV)] };
}`;
  }

  const hash = computeEvalscriptHash(evalscript);
  return { evalscript, version, hash };
}

export function buildStatisticalPolygonPayload(
  geometry: GeoJSONGeometry,
  satellite: string,
  variables: string[],
  periodFrom: string,
  periodTo: string,
  interval: TimeSeriesInterval = "P5D"
) {
  const { evalscript } = buildMultiVariableEvalscript(satellite, variables);

  return {
    input: {
      bounds: {
        properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
        geometry,
      },
      data: [
        {
          type: satellite === "sentinel-2" ? "sentinel-2-l2a" : "sentinel-1-grd",
        },
      ],
    },
    aggregation: {
      timeRange: {
        from: periodFrom,
        to: periodTo,
      },
      aggregationInterval: {
        of: interval,
      },
      evalscript,
      resx: 0.0001, // ~10m resolution in WGS84
      resy: 0.0001,
    },
  };
}

export type GetIndexTimeSeriesRequest = {
  tenantId: string;
  predioId: string;
  satellite: string;
  variables: string[];
  geometry: GeoJSONGeometry;
  periodFrom?: string;
  periodTo?: string;
  interval?: TimeSeriesInterval;
  accessToken?: string;
  isDemoMode?: boolean;
};

export async function getIndexTimeSeries(request: GetIndexTimeSeriesRequest): Promise<{
  source: string;
  pointsByVariable: Record<string, TimeSeriesPoint[]>;
}> {
  const { isSstSupportedForSatellite, buildMultiVariableEvalscript, buildStatisticalPolygonPayload } = await import("./copernicus-time-series-service");
  const { listObservacionesSerieDb, saveObservacionesSerieDb } = await import("../db/repository");
  const { copernicusCDSEProvider } = await import("../copernicus");

  const interval = request.interval ?? "P5D";
  const periodTo = request.periodTo ?? new Date().toISOString();
  const periodFrom = request.periodFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Validate SST availability
  for (const v of request.variables) {
    if (v === "sst") {
      const sstCheck = isSstSupportedForSatellite(request.satellite);
      if (!sstCheck.supported) {
        throw new Error(`Variable sst no disponible para ${request.satellite}: ${sstCheck.reason}`);
      }
    }
  }

  // 1. Check existing observations in DB for incremental update
  const pointsByVariable: Record<string, TimeSeriesPoint[]> = {};
  let allVariablesInDb = true;

  for (const v of request.variables) {
    const existing = await listObservacionesSerieDb(
      request.tenantId,
      request.predioId,
      request.satellite,
      v,
      request.accessToken
    );
    if (existing.length > 0) {
      pointsByVariable[v] = existing.map(s => ({
        intervaloDesde: s.intervalo_desde,
        intervaloHasta: s.intervalo_hasta,
        valor: s.valor,
        status: s.valor === null ? "sin_dato" : (s.nivel_confianza === "baja_confianza" ? "baja_confianza" : "ok"),
        porcentajePixelesValidos: s.porcentaje_pixeles_validos ?? 1.0,
        evalscriptVersion: s.evalscript_version ?? "v1.0.0",
        evalscriptHash: s.evalscript_hash ?? "v1_hash",
      }));
    } else {
      allVariablesInDb = false;
    }
  }

  if (allVariablesInDb && Object.keys(pointsByVariable).length === request.variables.length) {
    return {
      source: "observaciones_serie_db",
      pointsByVariable,
    };
  }

  const evalMeta = buildMultiVariableEvalscript(request.satellite, request.variables);

  // If in demo mode or live CDSE disabled / test fallback, generate or query API
  if (request.isDemoMode || process.env.COPERNICUS_MODE !== "live") {
    const intervals = [
      { desde: "2024-01-01T00:00:00Z", hasta: "2024-01-06T00:00:00Z" },
      { desde: "2024-01-06T00:00:00Z", hasta: "2024-01-11T00:00:00Z" },
      { desde: "2024-01-11T00:00:00Z", hasta: "2024-01-16T00:00:00Z" },
    ];

    const pointsToSave: any[] = [];

    for (const v of request.variables) {
      pointsByVariable[v] = intervals.map((intv, idx) => {
        // Distinct values for each variable to avoid cross-variable value copying!
        let val: number | null = null;
        if (idx !== 1) { // idx 1 is cloud/sin_dato
          if (v === "ndvi") val = Number((0.62 + idx * 0.06).toFixed(4));
          else if (v === "ndmi") val = Number((0.25 + idx * 0.04).toFixed(4));
          else if (v === "ndre") val = Number((0.45 + idx * 0.05).toFixed(4));
          else val = Number((0.50 + idx * 0.03).toFixed(4));
        }

        const point: TimeSeriesPoint = {
          intervaloDesde: intv.desde,
          intervaloHasta: intv.hasta,
          valor: val,
          status: val === null ? "sin_dato" : "ok",
          porcentajePixelesValidos: val === null ? 0.0 : 0.92,
          evalscriptVersion: evalMeta.version,
          evalscriptHash: evalMeta.hash,
        };

        pointsToSave.push({
          tenant_id: request.tenantId,
          predio_id: request.predioId,
          satelite: request.satellite,
          variable: v,
          intervalo_desde: intv.desde,
          intervalo_hasta: intv.hasta,
          valor: val,
          porcentaje_pixeles_validos: point.porcentajePixelesValidos,
          nivel_confianza: point.status === "baja_confianza" ? "baja_confianza" : "alta",
          evalscript_version: point.evalscriptVersion,
          evalscript_hash: point.evalscriptHash,
          data_source: "synthetic",
        });

        return point;
      });
    }

    await saveObservacionesSerieDb(pointsToSave, request.accessToken);

    return {
      source: "synthetic_demo",
      pointsByVariable,
    };
  }

  // Live CDSE Statistical API query
  const payload = buildStatisticalPolygonPayload(
    request.geometry,
    request.satellite,
    request.variables,
    periodFrom,
    periodTo,
    interval
  );

  const tokenManager = copernicusCDSEProvider.getTokenManager();
  const token = await tokenManager.fetchAccessToken();

  const response = await fetch("https://sh.dataspace.copernicus.eu/api/v1/statistics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Copernicus Statistical API HTTP ${response.status}: ${errText}`);
  }

  const responseData = await response.json();
  const intervalsData = Array.isArray(responseData?.data) ? responseData.data : [];

  const pointsToSave: any[] = [];

  for (const v of request.variables) {
    pointsByVariable[v] = intervalsData.map((intervalObj: any) => {
      const fromStr = intervalObj.interval?.from ?? periodFrom;
      const toStr = intervalObj.interval?.to ?? periodTo;
      const outputs = intervalObj.outputs;
      const varOutput = outputs?.[v] ?? outputs?.default;
      const meanVal = varOutput?.bands?.B0?.stats?.mean;

      const isValidVal = Number.isFinite(meanVal);
      const val = isValidVal ? Number(Number(meanVal).toFixed(4)) : null;

      const point: TimeSeriesPoint = {
        intervaloDesde: fromStr,
        intervaloHasta: toStr,
        valor: val,
        status: val === null ? "sin_dato" : "ok",
        porcentajePixelesValidos: isValidVal ? 0.90 : 0.0,
        evalscriptVersion: evalMeta.version,
        evalscriptHash: evalMeta.hash,
      };

      pointsToSave.push({
        tenant_id: request.tenantId,
        predio_id: request.predioId,
        satelite: request.satellite,
        variable: v,
        intervalo_desde: fromStr,
        intervalo_hasta: toStr,
        valor: val,
        porcentaje_pixeles_validos: point.porcentajePixelesValidos,
        nivel_confianza: point.status === "baja_confianza" ? "baja_confianza" : "alta",
        evalscript_version: point.evalscriptVersion,
        evalscript_hash: point.evalscriptHash,
        data_source: "copernicus_cdse",
      });

      return point;
    });
  }

  await saveObservacionesSerieDb(pointsToSave, request.accessToken);

  return {
    source: "copernicus_time_series",
    pointsByVariable,
  };
}
