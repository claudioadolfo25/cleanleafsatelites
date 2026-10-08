import {
  DomainAgentId,
  ConfidenceScore,
  SpecialistConsultResult,
  DOMAIN_AGENTS_CATALOG,
} from "@shared/domain-agents";

export class DataSensorsAgent {
  public consult(params: {
    cloudCoverPct: number;
    validPixelRatio: number;
    ndviMean: number;
  }): SpecialistConsultResult {
    const timestamp = new Date().toISOString();
    const confidence: ConfidenceScore =
      params.validPixelRatio >= 0.7 && params.cloudCoverPct <= 20
        ? "HIGH"
        : params.validPixelRatio >= 0.3
        ? "MEDIUM"
        : "LOW_CONFIDENCE";

    let estimatedStage = "V6 - Crecimiento Vegetativo";
    if (params.ndviMean > 0.75) estimatedStage = "R1 - Floración / Espigamiento";
    else if (params.ndviMean < 0.3) estimatedStage = "V2 - Emergencia / Estadio Temprano";

    return {
      agentId: "data_sensors",
      agentName: DOMAIN_AGENTS_CATALOG.data_sensors.name,
      confidence,
      findings: [
        `Fusión Sentinel-1/2 evaluada: NDVI medio de ${params.ndviMean.toFixed(2)}.`,
        `Píxeles claros SCL: ${(params.validPixelRatio * 100).toFixed(0)}%. Cobertura nubosa: ${params.cloudCoverPct}%.`,
        `Etapa fenológica estimada por satélite: ${estimatedStage}.`,
      ],
      warnings:
        confidence === "LOW_CONFIDENCE"
          ? ["Muestra satelital altamente nublada. Se activó fusión con humedad radar Sentinel-1."]
          : [],
      origin: {
        agentId: "data_sensors",
        agentName: DOMAIN_AGENTS_CATALOG.data_sensors.name,
        confidence,
        timestamp,
      },
    };
  }
}

export class ClimateAgent {
  public consult(params: {
    gddAccumulated: number;
    rainfallMm: number;
    sowingDate: string;
  }): SpecialistConsultResult {
    const timestamp = new Date().toISOString();
    let thermalStage = "V6 - Crecimiento Vegetativo";
    if (params.gddAccumulated > 850) thermalStage = "R1 - Floración / Espigamiento";
    else if (params.gddAccumulated < 200) thermalStage = "V2 - Emergencia";

    return {
      agentId: "climate",
      agentName: DOMAIN_AGENTS_CATALOG.climate.name,
      confidence: "HIGH",
      findings: [
        `GDD acumulados desde siembra (${params.sowingDate}): ${params.gddAccumulated} GDD.`,
        `Precipitación acumulada: ${params.rainfallMm} mm.`,
        `Etapa fenológica esperada por calendario térmico: ${thermalStage}.`,
      ],
      warnings:
        params.rainfallMm < 20
          ? ["Precipitación acumulada bajo el umbral crítico para la etapa activa."]
          : [],
      origin: {
        agentId: "climate",
        agentName: DOMAIN_AGENTS_CATALOG.climate.name,
        confidence: "HIGH",
        timestamp,
      },
    };
  }
}

export class GeneticsAgent {
  public consult(params: {
    hybridVariety: string;
    targetDensityPlantsHa: number;
  }): SpecialistConsultResult {
    const timestamp = new Date().toISOString();
    const maxDensitySupported = 85000;
    const isExceeded = params.targetDensityPlantsHa > maxDensitySupported;

    return {
      agentId: "genetics",
      agentName: DOMAIN_AGENTS_CATALOG.genetics.name,
      confidence: "HIGH",
      findings: [
        `Variedad declarada: ${params.hybridVariety}. Densidad objetivo: ${params.targetDensityPlantsHa.toLocaleString()} plantas/ha.`,
        `Rango de densidad técnica recomendado para esta variedad: 65,000 - 80,000 plantas/ha.`,
      ],
      warnings: isExceeded
        ? [`La densidad de ${params.targetDensityPlantsHa.toLocaleString()} plantas/ha excede el soporte recomendado para ${params.hybridVariety} (Riesgo de acame y tallo débil).`]
        : [],
      origin: {
        agentId: "genetics",
        agentName: DOMAIN_AGENTS_CATALOG.genetics.name,
        confidence: "HIGH",
        timestamp,
      },
    };
  }
}

export class NutritionAgent {
  public consult(params: {
    consolidatedStage: string;
    hasFertilizationHistory: boolean;
  }): SpecialistConsultResult {
    const timestamp = new Date().toISOString();
    const isR1 = params.consolidatedStage.includes("R1");

    return {
      agentId: "nutrition",
      agentName: DOMAIN_AGENTS_CATALOG.nutrition.name,
      confidence: "HIGH",
      findings: [
        `Etapa consolidada evaluada: ${params.consolidatedStage}.`,
        isR1
          ? "Atención: Etapa crítica R1 (Floración/Espigamiento) en curso. Ventana de absorción de N y H2O no recuperable si hay estrés hídrico o nutricional."
          : "Etapa vegetativa normal. Absorción progresiva de Nitrógeno y Calcio.",
      ],
      warnings: isR1
        ? ["VENTANA CRÍTICA NO RECUPERABLE R1: Cualquier deficiencia en este periodo impactará directamente el número de granos por espiga."]
        : [],
      recommendationRange: isR1
        ? "Sugerido: Mantener humedad a capacidad de campo y aplicar complemento foliar N-K entre 15 - 25 kg N/ha equivalente."
        : "Sugerido: Mantener plan nutricional base según análisis de suelo.",
      origin: {
        agentId: "nutrition",
        agentName: DOMAIN_AGENTS_CATALOG.nutrition.name,
        confidence: "HIGH",
        timestamp,
      },
    };
  }
}

export class HealthAgent {
  public consult(params: {
    hasFieldPhoto: boolean;
    unexplainedVigorDrop: boolean;
  }): SpecialistConsultResult {
    const timestamp = new Date().toISOString();
    const confidence: ConfidenceScore = params.hasFieldPhoto ? "HIGH" : "MEDIUM";

    return {
      agentId: "health",
      agentName: DOMAIN_AGENTS_CATALOG.health.name,
      confidence,
      findings: [
        params.unexplainedVigorDrop
          ? "Caída atípica de vigor detectada en subclúster del lote no explicada por nubes ni sequía."
          : "Sin caídas anómalas de vigor espacial.",
      ],
      warnings: params.unexplainedVigorDrop
        ? ["Alerta de Sanidad: Se requiere inspección física en campo para descartar foco de plaga o mancha foliar."]
        : [],
      origin: {
        agentId: "health",
        agentName: DOMAIN_AGENTS_CATALOG.health.name,
        confidence,
        timestamp,
      },
    };
  }
}

export class ManagementAgent {
  public consult(params: {
    consolidatedStage: string;
  }): SpecialistConsultResult {
    const timestamp = new Date().toISOString();
    return {
      agentId: "management",
      agentName: DOMAIN_AGENTS_CATALOG.management.name,
      confidence: "HIGH",
      findings: [
        `Planificación operativa asignada a etapa ${params.consolidatedStage}.`,
        "Checklist: Monitoreo de emisores de riego, limpieza de fajas y calibración de maquinaria de aplicación posterior a floración.",
      ],
      warnings: [],
      origin: {
        agentId: "management",
        agentName: DOMAIN_AGENTS_CATALOG.management.name,
        confidence: "HIGH",
        timestamp,
      },
    };
  }
}
