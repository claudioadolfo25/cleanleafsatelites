export type ConfidenceLevel = "alto" | "medio" | "bajo" | "no_concluyente";

export interface ConfidenceInput {
  validObservations: number;
  cloudCoverageAvg: number;
  daysSinceLastObservation: number;
  trendConsistency: "consistente" | "parcial" | "contradictoria";
}

export interface ConfidenceResult {
  level: ConfidenceLevel;
  factors: string[];
}

/**
 * Pure deterministic confidence rules engine.
 * No LLM dependencies.
 */
export function calcularConfianza(input: ConfidenceInput): ConfidenceResult {
  const factors: string[] = [];

  if (input.trendConsistency === "contradictoria") {
    factors.push("Tendencia espacial o temporal contradictoria entre sensores");
    return { level: "no_concluyente", factors };
  }

  if (input.validObservations === 0) {
    factors.push("Sin observaciones satelitales válidas recientes");
    return { level: "no_concluyente", factors };
  }

  // Check HIGH confidence
  if (
    input.validObservations >= 3 &&
    input.cloudCoverageAvg < 20 &&
    input.trendConsistency === "consistente" &&
    input.daysSinceLastObservation <= 15
  ) {
    factors.push(`≥3 observaciones válidas en 15 días (${input.validObservations} registradas)`);
    factors.push(`Nubosidad baja promedio de ${input.cloudCoverageAvg.toFixed(1)}%`);
    factors.push("Tendencia espacial y temporal altamente consistente");
    return { level: "alto", factors };
  }

  // Check MEDIUM confidence
  if (
    input.validObservations >= 2 &&
    input.cloudCoverageAvg < 35 &&
    input.daysSinceLastObservation <= 21
  ) {
    factors.push(`${input.validObservations} observaciones válidas en los últimos 21 días`);
    factors.push(`Nubosidad aceptable de ${input.cloudCoverageAvg.toFixed(1)}%`);
    factors.push(`Tendencia ${input.trendConsistency}`);
    return { level: "medio", factors };
  }

  // LOW confidence
  factors.push(`Observaciones limitadas (${input.validObservations})`);
  if (input.cloudCoverageAvg >= 50) {
    factors.push(`Nubosidad elevada (${input.cloudCoverageAvg.toFixed(1)}%)`);
  }
  if (input.daysSinceLastObservation > 21) {
    factors.push(`Imagen antigua (${input.daysSinceLastObservation} días desde última toma)`);
  }

  return { level: "bajo", factors };
}
