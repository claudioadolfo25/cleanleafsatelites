import {
  getVariablesPorSatelite,
  satelliteCatalog,
  type SatelliteId,
} from "./satellite-catalog";

export type Tier = "tier1_predio" | "tier2_extendido" | "tier3_regional";

export type SentinelMeasurement = {
  satelite: SatelliteId;
  variable: string;
  valor: number;
  unidad: string;
  fecha_adquisicion: Date;
};

export function resolveTier(hectares: number): Tier {
  if (hectares < 50) return "tier1_predio";
  if (hectares < 500) return "tier2_extendido";
  return "tier3_regional";
}

export function tierLabel(tier: Tier): string {
  return {
    tier1_predio: "Predio",
    tier2_extendido: "Zona extendida",
    tier3_regional: "Regional",
  }[tier];
}

function stableValue(seed: string, min: number, max: number): number {
  const hash = Array.from(seed).reduce((accumulator, character) => {
    return (accumulator * 31 + character.charCodeAt(0)) % 10_000;
  }, 17);
  const normalized = hash / 10_000;
  return Number((min + normalized * (max - min)).toFixed(2));
}

function measurement(
  predioId: string,
  satellite: SatelliteId,
  variable: string,
): SentinelMeasurement {
  const definition = getVariablesPorSatelite(satellite).find(item => item.variable === variable);
  if (!definition) {
    throw new Error(`${variable} no es una variable disponible en ${satelliteCatalog[satellite].nombre}`);
  }

  return {
    satelite: satellite,
    variable,
    valor: stableValue(`${predioId}:${satellite}:${variable}`, definition.rango[0], definition.rango[1]),
    unidad: definition.unidad,
    fecha_adquisicion: new Date(),
  };
}

export async function querySentinel1(predioId: string, variable = "sigma0_vv"): Promise<SentinelMeasurement> {
  return measurement(predioId, "sentinel-1", variable);
}

export async function querySentinel2(predioId: string, variable = "ndvi"): Promise<SentinelMeasurement> {
  return measurement(predioId, "sentinel-2", variable);
}

export async function querySentinel3(predioId: string, variable = "sst"): Promise<SentinelMeasurement> {
  return measurement(predioId, "sentinel-3", variable);
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
