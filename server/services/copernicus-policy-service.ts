import type { SatelliteQueryRequest } from "../../shared/observation-provider";
import type { SentinelMeasurement } from "../../shared/satellite-service";
import { getSupabaseUserClient } from "../db/supabase-client";

export type CopernicusProdPolicy = "live" | "synthetic_demo_only" | "disabled";

export function getCopernicusProdPolicy(env: NodeJS.ProcessEnv = process.env): CopernicusProdPolicy {
  const raw = env.COPERNICUS_PROD_POLICY;
  if (raw === "live") return "live";
  if (raw === "disabled") return "disabled";
  return "synthetic_demo_only";
}

let cdseRequestCountInWindow = 0;
let cdseWindowResetAt = Date.now() + 60000;
const CDSE_MAX_REQUESTS_PER_MINUTE = 60;

export function checkAndIncrementCdseQuota(): { allowed: boolean; reason?: string } {
  const now = Date.now();
  if (now > cdseWindowResetAt) {
    cdseRequestCountInWindow = 0;
    cdseWindowResetAt = now + 60000;
  }

  if (cdseRequestCountInWindow >= CDSE_MAX_REQUESTS_PER_MINUTE) {
    console.warn("[CopernicusQuota] Umbral de cuota por minuto excedido hacia Copernicus CDSE.");
    return { allowed: false, reason: "Cuota de peticiones por minuto excedida para Copernicus CDSE" };
  }

  cdseRequestCountInWindow++;
  return { allowed: true };
}

export function evaluateDataQuality(validPixelPercentage: number): {
  validPixelPercentage: number;
  confidence: "alta" | "baja_confianza";
  warningMessage?: string;
} {
  const minThreshold = 0.6; // 60% valid pixels minimum
  if (validPixelPercentage < minThreshold) {
    return {
      validPixelPercentage,
      confidence: "baja_confianza",
      warningMessage: `Alto nivel de nubosidad o sombra (solo ${(validPixelPercentage * 100).toFixed(1)}% de píxeles válidos). Se sugiere ampliar el período de consulta.`,
    };
  }
  return {
    validPixelPercentage,
    confidence: "alta",
  };
}

export function generateCacheKey(request: SatelliteQueryRequest): string {
  const bboxStr = request.bbox ? request.bbox.join(",") : "default_bbox";
  const fromStr = request.periodFrom ?? "2024-01-01";
  const toStr = request.periodTo ?? "2024-02-01";
  return `${request.satellite}:${request.variable}:${bboxStr}:${fromStr}:${toStr}`;
}
