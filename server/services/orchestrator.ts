import {
  ConfidenceScore,
  AgentOrigin,
  OrchestratorConsolidatedResponse,
} from "@shared/domain-agents";
import {
  DataSensorsAgent,
  ClimateAgent,
  GeneticsAgent,
  NutritionAgent,
  HealthAgent,
  ManagementAgent,
} from "./specialists";

export class DomainAgentOrchestrator {
  private dataAgent = new DataSensorsAgent();
  private climateAgent = new ClimateAgent();
  private geneticsAgent = new GeneticsAgent();
  private nutritionAgent = new NutritionAgent();
  private healthAgent = new HealthAgent();
  private managementAgent = new ManagementAgent();

  public orchestrateConsultation(params: {
    cloudCoverPct: number;
    validPixelRatio: number;
    ndviMean: number;
    gddAccumulated: number;
    rainfallMm: number;
    sowingDate: string;
    hybridVariety: string;
    targetDensityPlantsHa: number;
    hasFertilizationHistory: boolean;
    hasFieldPhoto: boolean;
    unexplainedVigorDrop: boolean;
  }): OrchestratorConsolidatedResponse {
    // Normalize validPixelRatio: if provided as percentage (>1, e.g. 95), convert to ratio (0.95)
    const normalizedValidPixelRatio =
      params.validPixelRatio > 1 ? params.validPixelRatio / 100 : params.validPixelRatio;

    // 1. Consult Specialist Domain Agents
    const dataRes = this.dataAgent.consult({
      cloudCoverPct: params.cloudCoverPct,
      validPixelRatio: normalizedValidPixelRatio,
      ndviMean: params.ndviMean,
    });

    const climateRes = this.climateAgent.consult({
      gddAccumulated: params.gddAccumulated,
      rainfallMm: params.rainfallMm,
      sowingDate: params.sowingDate,
    });

    const geneticsRes = this.geneticsAgent.consult({
      hybridVariety: params.hybridVariety,
      targetDensityPlantsHa: params.targetDensityPlantsHa,
    });

    // Rule 1: Check confidence threshold of Data Agent
    if (dataRes.confidence === "LOW_CONFIDENCE") {
      return {
        finalRecommendation:
          "Dato insuficiente para emitir una recomendación consolidada. La muestra satelital presenta alta cobertura nubosa. Verifique en campo o consulte la pasada Sentinel-1 Radar.",
        consolidatedConfidence: "LOW_CONFIDENCE",
        participatingAgents: [dataRes.origin],
        discrepancyFlagged: false,
      };
    }

    // 2. Contrast Data vs Climate Phenological Stage
    const satStage = dataRes.findings[2]?.split(": ")[1] || "V4";
    const thermalStage = climateRes.findings[2]?.split(": ")[1] || "V4";
    const discrepancyFlagged = satStage !== thermalStage;

    // Discrepancy handling: Maintain satellite stage as provisional, downgrade confidence to MEDIUM
    const consolidatedStage = satStage;

    const nutritionRes = this.nutritionAgent.consult({
      consolidatedStage,
      hasFertilizationHistory: params.hasFertilizationHistory,
    });

    const healthRes = this.healthAgent.consult({
      hasFieldPhoto: params.hasFieldPhoto,
      unexplainedVigorDrop: params.unexplainedVigorDrop,
    });

    const managementRes = this.managementAgent.consult({
      consolidatedStage,
    });

    // Participating Agents
    const participatingAgents: AgentOrigin[] = [
      dataRes.origin,
      climateRes.origin,
      geneticsRes.origin,
      nutritionRes.origin,
      healthRes.origin,
      managementRes.origin,
    ];

    // Consolidated Confidence
    let consolidatedConfidence: ConfidenceScore = "HIGH";
    if (discrepancyFlagged || healthRes.confidence === "MEDIUM") {
      consolidatedConfidence = "MEDIUM";
    }

    // Priority Rule: R1 Non-recoverable window alert
    const isR1Alert = nutritionRes.warnings.some((w) => w.includes("R1"));

    // Build Final Recommendation
    const summaryLines: string[] = [
      `[Consenso Orquestador]: Análisis integrado para ${params.hybridVariety} en etapa provisional ${consolidatedStage}.`,
    ];

    if (discrepancyFlagged) {
      summaryLines.push(
        `Discrepancia detectada: Satélite estima '${satStage}' vs Clima '${thermalStage}'. Confianza clasificada como MEDIA. Se sugiere verificación agronómica en campo antes de aplicar dosis masivas.`
      );
    }

    if (isR1Alert) {
      summaryLines.push(`PRIORIDAD ALTA: ${nutritionRes.warnings[0]}`);
      if (nutritionRes.recommendationRange) {
        summaryLines.push(nutritionRes.recommendationRange);
      }
    }

    if (geneticsRes.warnings.length > 0) {
      summaryLines.push(`Advertencia Genética: ${geneticsRes.warnings[0]}`);
    }

    if (healthRes.warnings.length > 0) {
      summaryLines.push(`Alerta Sanitaria: ${healthRes.warnings[0]}`);
    }

    if (managementRes.findings.length > 0) {
      summaryLines.push(`Gestión de Maquinaria: ${managementRes.findings[0]}`);
    }

    return {
      finalRecommendation: summaryLines.join("\n\n"),
      consolidatedConfidence,
      participatingAgents,
      discrepancyFlagged,
      discrepancyDetails: discrepancyFlagged
        ? `Satelital (${satStage}) vs Térmico (${thermalStage})`
        : undefined,
      unrecoverableWindowAlert: isR1Alert,
    };
  }
}
