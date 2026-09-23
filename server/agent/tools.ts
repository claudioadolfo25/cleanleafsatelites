import type { ToolDefinition } from "../services/llm";

export const agentTools: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "consultar_parcela",
      description: "Obtiene datos de una parcela (polígono, área, historial)",
      parameters: {
        type: "object",
        properties: {
          parcela_id: { type: "string", description: "ID de la parcela" },
        },
        required: ["parcela_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_indices_satelitales",
      description: "Obtiene NDVI/NDRE de los últimos N días con fechas y nubosidad",
      parameters: {
        type: "object",
        properties: {
          parcela_id: { type: "string" },
          dias: { type: "number", description: "Días hacia atrás (default 30)" },
        },
        required: ["parcela_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_clima",
      description: "Obtiene precipitación y temperatura de los últimos N días",
      parameters: {
        type: "object",
        properties: {
          lat: { type: "number" },
          lon: { type: "number" },
          dias: { type: "number", description: "Días hacia atrás (default 15)" },
        },
        required: ["lat", "lon"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_labores",
      description: "Obtiene labores registradas en la temporada actual",
      parameters: {
        type: "object",
        properties: {
          temporada_id: { type: "string" },
        },
        required: ["temporada_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_analisis_suelo",
      description: "Obtiene el análisis de suelo cargado para la temporada",
      parameters: {
        type: "object",
        properties: {
          temporada_id: { type: "string" },
        },
        required: ["temporada_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_confianza",
      description: "Calcula nivel de confianza de una alerta según reglas determinísticas",
      parameters: {
        type: "object",
        properties: {
          validObservations: { type: "number" },
          cloudCoverageAvg: { type: "number" },
          daysSinceLastObservation: { type: "number" },
          trendConsistency: { type: "string", enum: ["consistente", "parcial", "contradictoria"] },
        },
        required: ["validObservations", "cloudCoverageAvg", "daysSinceLastObservation", "trendConsistency"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "registrar_accion",
      description: "Registra que el usuario siguió o no una recomendación",
      parameters: {
        type: "object",
        properties: {
          alerta_id: { type: "string" },
          accion: { type: "string", description: "seguir | ignorar | modificar" },
          resultado: { type: "string" },
        },
        required: ["alerta_id", "accion"],
      },
    },
  },
];
