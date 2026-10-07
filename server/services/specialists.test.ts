import { describe, expect, it } from "vitest";
import { DomainAgentOrchestrator } from "./orchestrator";
import { DataSensorsAgent, NutritionAgent } from "./specialists";

describe("Ecosistema de Agentes Especialistas por Dominio", () => {
  it("Agente de Datos/Sensores evalúa confianza según píxeles SCL y nubes", () => {
    const agent = new DataSensorsAgent();
    const highConf = agent.consult({ cloudCoverPct: 10, validPixelRatio: 0.95, ndviMean: 0.72 });
    expect(highConf.confidence).toBe("HIGH");

    const lowConf = agent.consult({ cloudCoverPct: 60, validPixelRatio: 0.2, ndviMean: 0.4 });
    expect(lowConf.confidence).toBe("LOW_CONFIDENCE");
    expect(lowConf.warnings.length).toBeGreaterThan(0);
  });

  it("Agente de Nutrición no receta marcas pero destaca ventana no recuperable R1", () => {
    const agent = new NutritionAgent();
    const r1Res = agent.consult({ consolidatedStage: "R1 - Floración", hasFertilizationHistory: true });
    expect(r1Res.warnings.some((w) => w.includes("R1"))).toBe(true);
    expect(r1Res.recommendationRange).toBeDefined();
  });

  it("Orquestador rechaza sugerencia si Agente de Datos reporta LOW_CONFIDENCE", () => {
    const orchestrator = new DomainAgentOrchestrator();
    const res = orchestrator.orchestrateConsultation({
      cloudCoverPct: 80,
      validPixelRatio: 0.15,
      ndviMean: 0.3,
      gddAccumulated: 300,
      rainfallMm: 10,
      sowingDate: "2026-08-01",
      hybridVariety: "Pioneer P1815VYHR",
      targetDensityPlantsHa: 75000,
      hasFertilizationHistory: false,
      hasFieldPhoto: false,
      unexplainedVigorDrop: false,
    });

    expect(res.consolidatedConfidence).toBe("LOW_CONFIDENCE");
    expect(res.finalRecommendation).toContain("Dato insuficiente");
  });

  it("Orquestador marca discrepancia y prioriza alerta R1 no recuperable", () => {
    const orchestrator = new DomainAgentOrchestrator();
    const res = orchestrator.orchestrateConsultation({
      cloudCoverPct: 5,
      validPixelRatio: 0.9,
      ndviMean: 0.8, // Satélite estima R1
      gddAccumulated: 400, // Clima estima V6 (Discrepancia)
      rainfallMm: 50,
      sowingDate: "2026-08-01",
      hybridVariety: "DK72-10",
      targetDensityPlantsHa: 90000, // Excesivo
      hasFertilizationHistory: true,
      hasFieldPhoto: true,
      unexplainedVigorDrop: true,
    });

    expect(res.discrepancyFlagged).toBe(true);
    expect(res.unrecoverableWindowAlert).toBe(true);
    expect(res.participatingAgents.length).toBe(6);
  });
});
