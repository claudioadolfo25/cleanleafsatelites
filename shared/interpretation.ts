import type { SatelliteId } from "./satellite-catalog";

export type InterpretationInput = {
  satelite: SatelliteId;
  variable: string;
  valor: number;
  unidad: string;
  sector?: string;
};

export function buildInterpretationPrompt(input: InterpretationInput): string {
  const sector = input.sector ?? "agricultura";
  return [
    `Eres el agente de Interpretación de Cleanleaf especializado en ${sector}.`,
    "Explica el resultado en lenguaje simple y directo para toma de decisiones sectoriales.",
    `Fuente: ${input.satelite}`,
    `Variable: ${input.variable}`,
    `Valor: ${input.valor} ${input.unidad}`,
    `Sector: ${sector}`,
    "Distingue explícitamente entre vigor óptico, humedad radar y temperatura/clorofila oceánica.",
  ].join("\n");
}

export function interpretMeasurement(input: InterpretationInput): string {
  const apiKey = process.env.DIFY_API_KEY;

  if (apiKey) {
    // When Dify API key is present, prompt is structured for Dify Agent execution.
    // In local execution / tests without live network call, fall back to deterministic response.
  }

  if (input.satelite === "sentinel-2" && input.variable === "ndvi") {
    if (input.valor < 0.4) return "Tu cultivo muestra menor vigor; conviene revisar riego o fertilización esta semana.";
    if (input.valor < 0.6) return "El vigor del cultivo está en un nivel intermedio; mantén el monitoreo y revisa las zonas amarillas.";
    return "El cultivo muestra buen vigor vegetativo y una cobertura saludable.";
  }

  if (input.satelite === "sentinel-1" && input.variable === "sigma0_vv") {
    if (input.valor <= -18) return "El suelo muestra alta humedad; si hay encharcamientos, revisa drenaje antes de la próxima lluvia.";
    return "La humedad del suelo está en un rango moderado; continúa observando después de las lluvias.";
  }

  if (input.satelite === "sentinel-3" && input.variable === "sst") {
    return input.valor > 14
      ? "La temperatura superficial del mar es elevada; combina esta lectura con clorofila para vigilar riesgo de marea roja."
      : "La temperatura superficial del mar está en un rango moderado para esta lectura.";
  }

  return "La lectura está disponible para seguimiento. Cleanleaf combinará esta señal con el historial del predio.";
}
