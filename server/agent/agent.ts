import { buildSystemPrompt } from "./system-prompt";
import { agentTools } from "./tools";
import { executeTool } from "./tool-executor";
import type { AgentContext, AgentInput, AgentOutput } from "./types";
import { createLLMService, type ChatMessage } from "../services/llm";

export async function runAgent(input: AgentInput): Promise<AgentOutput> {
  const contexto: AgentContext = {
    parcela: {
      id: input.parcela_id || "parcela-lote3",
      nombre: "Lote 3 Norte",
      area_ha: 45.5,
    },
    temporada: {
      id: input.temporada_id || "temp-2026",
      ciclo: "2026-2027",
      fase_actual: input.fase_actual ?? 4,
    },
    analisis_suelo: {
      ph: 5.8,
      n: 22.4,
      p: 12.1,
      k: 180.5,
      mo: 1.2,
    },
    alertas_recientes: [
      { tipo: "bajo_vigor", confianza: "medio", fecha: "2024-08-25" },
    ],
    labores_recientes: [
      { tipo: "siembra", fecha: "2024-05-10" },
      { tipo: "fertilizacion", fecha: "2024-06-15" },
    ],
  };

  const systemPrompt = buildSystemPrompt(contexto);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: input.mensaje },
  ];

  const llm = createLLMService();
  const response = await llm.chat(messages, agentTools);

  let parsed: Partial<AgentOutput> = {};
  try {
    parsed = JSON.parse(response.content);
  } catch {
    parsed = { respuesta: response.content };
  }

  const output: AgentOutput = {
    respuesta: parsed.respuesta || "Análisis completado para tu lote.",
    deteccion: parsed.deteccion,
    hipotesis: parsed.hipotesis,
    accion_recomendada: parsed.accion_recomendada,
    confianza: parsed.confianza || "medio",
    factores_confianza: parsed.factores_confianza || ["2 observaciones válidas en 21 días"],
    requiere_escalamiento: parsed.requiere_escalamiento || false,
    herramientas_usadas: parsed.herramientas_usadas || ["consultar_indices_satelitales"],
  };

  return output;
}
