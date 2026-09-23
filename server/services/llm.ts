import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

// ============================================================================
// TIPOS (Deben coincidir con server/agent/types.ts o shared/types.ts)
// ============================================================================
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface LLMResponse {
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface LLMService {
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse>;
}

// ============================================================================
// IMPLEMENTACIÓN REAL: OpenAIService
// ============================================================================
export class OpenAIService implements LLMService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = "gpt-4o") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    try {
      // 1. Mapear mensajes al formato estricto de OpenAI
      const openaiMessages: ChatCompletionMessageParam[] = messages.map((msg) => {
        if (msg.role === "assistant" && msg.tool_calls) {
          return {
            role: "assistant",
            content: msg.content,
            tool_calls: msg.tool_calls as any,
          };
        }
        if (msg.role === "tool") {
          return {
            role: "tool",
            content: msg.content,
            tool_call_id: msg.tool_call_id!,
            name: msg.name,
          };
        }
        return {
          role: msg.role as "system" | "user",
          content: msg.content,
        };
      });

      // 2. Mapear herramientas al formato de OpenAI
      const openaiTools: ChatCompletionTool[] | undefined = tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        },
      }));

      // 3. Llamar a la API
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        tools: openaiTools,
        tool_choice: "auto", // Permite al modelo decidir si usa una herramienta
      });

      const choice = response.choices[0];
      const message = choice?.message;

      return {
        content: message?.content || "",
        tool_calls: message?.tool_calls as any,
      };
    } catch (error) {
      console.error("❌ OpenAI API Error:", error);
      // Fallback de emergencia: si falla la API, devolvemos un error controlado
      // en lugar de romper todo el flujo del agente.
      throw new Error("Fallo en la comunicación con el modelo de lenguaje (OpenAI).");
    }
  }
}

// ============================================================================
// IMPLEMENTACIÓN MOCK: Fallback seguro
// ============================================================================
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

// ============================================================================
// FÁBRICA: Decisor de implementación
// ============================================================================
export function createLLMService(): LLMService {
  const provider = process.env.LLM_PROVIDER?.toLowerCase();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  if (provider === "openai" && apiKey && apiKey.length > 10) {
    console.log("✅ Agente 44.05: Conectado a OpenAI (Modelo:", model, ")");
    return new OpenAIService(apiKey, model);
  }

  console.log("🛡️ Agente 44.05: Ejecutando en modo MOCK (Sin API Key válida)");
  return new MockLLMService();
}
