import {
  getVariablesPorSatelite,
  satelliteCatalog,
  type SatelliteId,
} from "./satellite-catalog";
import { getTierForSuperficie, type ProcessingTier } from "./satellite-router";
import { copernicusProvider } from "../src/lib/copernicus";

export type Tier = ProcessingTier;

export type SentinelMeasurement = {
  satelite: SatelliteId;
  variable: string;
  valor: number;
  unidad: string;
  fecha_adquisicion: Date;
};

export function resolveTier(hectares: number): Tier {
  return getTierForSuperficie(hectares);
}

export function tierLabel(tier: Tier): string {
  return {
    tier1_predio: "Predio",
    tier2_extendido: "Zona extendida",
    tier3_regional: "Regional",
  }[tier];
}

export async function querySentinel1(predioId: string, variable = "sigma0_vv"): Promise<SentinelMeasurement> {
  return copernicusProvider.query(predioId, "sentinel-1", variable);
}

export async function querySentinel2(predioId: string, variable = "ndvi"): Promise<SentinelMeasurement> {
  return copernicusProvider.query(predioId, "sentinel-2", variable);
}

export async function querySentinel3(predioId: string, variable = "sst"): Promise<SentinelMeasurement> {
  return copernicusProvider.query(predioId, "sentinel-3", variable);
}

export function querySentinel(
  predioId: string,
  satellite: SatelliteId,
  variable?: string,
): Promise<SentinelMeasurement> {
  const defaultVariable = getVariablesPorSatelite(satellite)[0]?.variable;
  const selectedVariable = variable ?? defaultVariable;
  if (!selectedVariable) throw new Error("No hay variables configuradas para el satélite solicitado");

  if (satellite === "sentinel-1") return querySentinel1(predioId, selectedVariable);
  if (satellite === "sentinel-2") return querySentinel2(predioId, selectedVariable);
  return querySentinel3(predioId, selectedVariable);
}
