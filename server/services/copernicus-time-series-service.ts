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
