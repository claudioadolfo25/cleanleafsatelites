import { getVariablesPorSatelite, satelliteCatalog, type SatelliteId } from "./satellite-catalog";

export function validateSatelliteVariable(satellite: SatelliteId, variable: string): void {
  if (variable === "sst") {
    throw new Error(`INVALID_SATELLITE_VARIABLE: La variable sst (Sea Surface Temperature) no está disponible en el catálogo de Sentinel Hub en CDSE (SLSTR L2 WST no soportado) y no se simula.`);
  }
  const available = getVariablesPorSatelite(satellite);
  if (!available.some(item => item.variable === variable)) {
    throw new Error(`INVALID_SATELLITE_VARIABLE: La variable ${variable} no está disponible para ${satelliteCatalog[satellite].nombre}.`);
  }
}
