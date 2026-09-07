import { getVariablesPorSatelite, satelliteCatalog, type SatelliteId } from "./satellite-catalog";

export function validateSatelliteVariable(satellite: SatelliteId, variable: string): void {
  const available = getVariablesPorSatelite(satellite);
  if (!available.some(item => item.variable === variable)) {
    throw new Error(`INVALID_SATELLITE_VARIABLE: La variable ${variable} no está disponible para ${satelliteCatalog[satellite].nombre}.`);
  }
}
