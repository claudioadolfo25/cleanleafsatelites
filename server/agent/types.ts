import type { ConfidenceLevel } from "../services/confidence";

export interface AgentInput {
  mensaje: string;
  parcela_id: string;
  temporada_id: string;
  fase_actual: number;
  alerta_id?: string;
}

export interface AgentOutput {
  respuesta: string;
  deteccion?: string;
  hipotesis?: string[];
  accion_recomendada?: string;
  confianza?: ConfidenceLevel;
  factores_confianza?: string[];
  requiere_escalamiento: boolean;
  herramientas_usadas: string[];
}

export interface AgentContext {
  parcela: { id: string; nombre: string; area_ha: number };
  temporada: { id: string; ciclo: string; fase_actual: number };
  analisis_suelo?: { ph: number; n: number; p: number; k: number; mo: number };
  alertas_recientes: Array<{ tipo: string; confianza: string; fecha: string }>;
  labores_recientes: Array<{ tipo: string; fecha: string }>;
}
