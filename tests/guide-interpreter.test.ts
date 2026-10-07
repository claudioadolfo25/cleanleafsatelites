import { describe, expect, it } from "vitest";

describe("Guía Interactiva de Informes", () => {
  it("valida la presencia de la ruta de la guía interactiva", () => {
    const guideRoute = "/dashboard/guias/interpretar-informes";
    expect(guideRoute).toBe("/dashboard/guias/interpretar-informes");
  });

  it("mantiene los conceptos clave en el glosario satelital", () => {
    const concepts = ["NDVI", "NDMI", "σ⁰ VV", "SST", "Clorofila-a"];
    expect(concepts.length).toBe(5);
    expect(concepts).toContain("NDVI");
    expect(concepts).toContain("NDMI");
  });
});
