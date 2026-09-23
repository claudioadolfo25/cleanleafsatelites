export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
}

export interface LLMService {
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse>;
}

export class MockLLMService implements LLMService {
  async chat(messages: ChatMessage[], _tools?: ToolDefinition[]): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || "";

    if (lastMessage.includes("dosis") || lastMessage.includes("cuanto fertilizante")) {
      return {
        content: JSON.stringify({
          respuesta: "No puedo prescribir dosis específicas sin conocer tu análisis de suelo completo, el híbrido que estás usando y las condiciones actuales de tu lote. Te sugiero consultar con tu agrónomo de confianza.",
          requiere_escalamiento: true,
          herramientas_usadas: [],
        }),
      };
    }

    return {
      content: JSON.stringify({
        deteccion: "El NDVI de la zona norte de tu parcela ha descendido un 18% respecto al promedio del lote en las últimas 2 observaciones satelitales.",
        hipotesis: [
          "Estrés hídrico (la zona norte tiene pendiente y pierde agua más rápido)",
          "Emergencia irregular o problema en siembra",
          "Deficiencia nutricional (análisis muestra fósforo bajo)",
        ],
        accion_recomendada: "Inspecciona 3 puntos en la zona norte hoy. Toma fotografías del follaje y verifica la humedad del suelo a 20 cm de profundidad.",
        confianza: "medio",
        factores_confianza: [
          "2 observaciones válidas en los últimos 21 días",
          "Nubosidad promedio de 18%",
          "Tendencia descendente consistente",
        ],
        requiere_escalamiento: false,
        herramientas_usadas: ["consultar_indices_satelitales", "consultar_analisis_suelo", "calcular_confianza"],
      }),
    };
  }
}

export function createLLMService(): LLMService {
  if (process.env.LLM_PROVIDER === "openai" && process.env.OPENAI_API_KEY) {
    // Return OpenAIService implementation when credentials configured
  }
  return new MockLLMService();
}
