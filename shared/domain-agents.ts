export type DomainAgentId =
  | "orchestrator"
  | "data_sensors"
  | "climate"
  | "genetics"
  | "nutrition"
  | "health"
  | "management";

export type ConfidenceScore = "HIGH" | "MEDIUM" | "LOW_CONFIDENCE";

export interface AgentOrigin {
  agentId: DomainAgentId;
  agentName: string;
  confidence: ConfidenceScore;
  timestamp: string;
}

export interface DomainAgentDefinition {
  id: DomainAgentId;
  name: string;
  role: string;
  knowledgeDomain: string;
  inputs: string[];
  outputs: string[];
  prohibitions: string[];
}

export const DOMAIN_AGENTS_CATALOG: Record<DomainAgentId, DomainAgentDefinition> = {
  orchestrator: {
    id: "orchestrator",
    name: "Agente Orquestador Central",
    role: "Coordinación, conciliación y motor de confianza auditable",
    knowledgeDomain: "Consolidación de especialistas y verificación de reglas duras",
    inputs: ["Consulta del agricultor", "Alertas de lotes"],
    outputs: ["Recomendación consolidada con trazabilidad de agentes y nivel de confianza"],
    prohibitions: ["No permite que un agente especialista responda fuera de su base asignada", "No emite recomendación final si la confianza es inferior al umbral"],
  },
  data_sensors: {
    id: "data_sensors",
    name: "Agente de Datos/Sensores",
    role: "Ingesta y limpieza de imágenes Sentinel-1/2 e índices espectrales",
    knowledgeDomain: "Firmas espectrales, NDVI, NDRE, humedad radar C-Band, fusión SCL ante nubes",
    inputs: ["Imágenes Sentinel-1/2", "Fotos de terreno", "Polígono PostGIS"],
    outputs: ["Vigor por zona", "Etapa fenológica estimada por satélite", "Nivel de confianza del dato"],
    prohibitions: ["No interpreta causas agronómicas — entrega estrictamente la señal y su confianza"],
  },
  climate: {
    id: "climate",
    name: "Agente de Clima",
    role: "Grados Días Desarrollo (GDD), precipitaciones y contraste fenológico",
    knowledgeDomain: "Meteorología agrícola, calendarios térmicos por especie, balance hídrico",
    inputs: ["Estación meteorológica / API Clima", "Fecha de siembra"],
    outputs: ["Etapa fenológica esperada por calendario térmico", "Alerta de discrepancia vs satélite"],
    prohibitions: ["No emite pronósticos agronómicos sin validar contraste con Agente de Datos"],
  },
  genetics: {
    id: "genetics",
    name: "Agente de Genética/Variedades",
    role: "Evaluación de densidad poblacional según híbrido o variedad",
    knowledgeDomain: "Tablas de densidad por variedad, resistencia a acame, ciclo biológico",
    inputs: ["Híbrido/variedad declarada", "Densidad objetivo (plantas/ha)", "Zona"],
    outputs: ["Criterios de densidad recomendada", "Alerta de exceso de densidad o riesgo de tallo débil"],
    prohibitions: ["No recomienda marcas comerciales específicas — entrega criterios técnicos imparciales"],
  },
  nutrition: {
    id: "nutrition",
    name: "Agente de Nutrición",
    role: "Curvas de absorción por etapa fenológica y ventanas críticas (ej. R1)",
    knowledgeDomain: "Curvas de extracción N/P/K/Ca/Mg, momentos críticos no recuperables",
    inputs: ["Etapa fenológica consolidada", "Densidad", "Historial de fertilización"],
    outputs: ["Ventana de nutrición sugerida", "Prioridad de aplicación en ventanas no recuperables"],
    prohibitions: ["Jamás prescribe dosis exacta de producto comercial — entrega rangos y momentos técnicos"],
  },
  health: {
    id: "health",
    name: "Agente de Sanidad",
    role: "Detección de anomalías visuales y caídas de vigor no explicadas",
    knowledgeDomain: "Patrones espectrales de plagas/enfermedades, anomalías focales",
    inputs: ["Fotos del lote", "Salida del Agente de Datos (caídas atípicas de vigor)"],
    outputs: ["Alerta de revisión en campo con nivel de confianza"],
    prohibitions: ["Nunca emite diagnóstico definitivo de plaga/enfermedad sin foto clara y validación humana"],
  },
  management: {
    id: "management",
    name: "Agente de Manejo/Mecanización",
    role: "Calendarización de labores y planificación del ciclo operativo",
    knowledgeDomain: "Ventanas operativas de siembra, pulverización y cosecha",
    inputs: ["Consolidado del Orquestador", "Ventanas críticas"],
    outputs: ["Checklist operativo y recordatorios del calendario del ciclo"],
    prohibitions: ["No opera maquinaria física — planifica exclusivamente el calendario operativo"],
  },
};

export interface SpecialistConsultResult {
  agentId: DomainAgentId;
  agentName: string;
  confidence: ConfidenceScore;
  findings: string[];
  warnings: string[];
  recommendationRange?: string;
  origin: AgentOrigin;
}

export interface OrchestratorConsolidatedResponse {
  finalRecommendation: string;
  consolidatedConfidence: ConfidenceScore;
  participatingAgents: AgentOrigin[];
  discrepancyFlagged: boolean;
  discrepancyDetails?: string;
  unrecoverableWindowAlert?: boolean;
}
