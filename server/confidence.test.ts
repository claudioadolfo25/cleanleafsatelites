import { describe, expect, it } from "vitest";
import { calcularConfianza } from "./services/confidence";

describe("Motor de Confianza Determinístico AgroPulso", () => {
  it("asigna nivel ALTO cuando se cumplen todas las condiciones estrictas", () => {
    const result = calcularConfianza({
      validObservations: 3,
      cloudCoverageAvg: 10,
      daysSinceLastObservation: 5,
      trendConsistency: "consistente",
    });

    expect(result.level).toBe("alto");
    expect(result.factors.join(" ")).toContain("≥3 observaciones");
    expect(result.factors.join(" ")).toContain("Nubosidad baja");
  });

  it("asigna nivel MEDIO cuando hay 2 observaciones en 21 días y nubosidad moderada", () => {
    const result = calcularConfianza({
      validObservations: 2,
      cloudCoverageAvg: 25,
      daysSinceLastObservation: 14,
      trendConsistency: "parcial",
    });

    expect(result.level).toBe("medio");
    expect(result.factors.join(" ")).toContain("2 observaciones válidas");
  });

  it("asigna nivel BAJO por nubosidad alta o antigüedad de imagen", () => {
    const lowCloud = calcularConfianza({
      validObservations: 1,
      cloudCoverageAvg: 55,
      daysSinceLastObservation: 10,
      trendConsistency: "consistente",
    });

    const oldImage = calcularConfianza({
      validObservations: 3,
      cloudCoverageAvg: 10,
      daysSinceLastObservation: 25,
      trendConsistency: "consistente",
    });

    expect(lowCloud.level).toBe("bajo");
    expect(lowCloud.factors.join(" ")).toContain("Nubosidad elevada");

    expect(oldImage.level).toBe("bajo");
    expect(oldImage.factors.join(" ")).toContain("Imagen antigua");
  });

  it("asigna NO_CONCLUYENTE cuando la tendencia es contradictoria o no hay observaciones", () => {
    const contradiction = calcularConfianza({
      validObservations: 4,
      cloudCoverageAvg: 5,
      daysSinceLastObservation: 2,
      trendConsistency: "contradictoria",
    });

    const noObs = calcularConfianza({
      validObservations: 0,
      cloudCoverageAvg: 0,
      daysSinceLastObservation: 0,
      trendConsistency: "consistente",
    });

    expect(contradiction.level).toBe("no_concluyente");
    expect(contradiction.factors.join(" ")).toContain("contradictoria");

    expect(noObs.level).toBe("no_concluyente");
    expect(noObs.factors.join(" ")).toContain("Sin observaciones");
  });
});
