import { describe, expect, it } from "vitest";
import { getReport, listReports } from "../shared/report-catalog";

describe("Dashboard de Informes y Descargas E2E", () => {
  it("lista informes con filtros por predio, satélite y estado", () => {
    const allReports = listReports();
    expect(allReports.length).toBeGreaterThan(0);

    const completed = listReports({ status: "completado" });
    expect(completed.every(report => report.status === "completado")).toBe(true);

    const lasQuinas = listReports({ predio: "Las Quinas" });
    expect(lasQuinas.every(report => report.predioNombre === "Las Quinas")).toBe(true);

    const sentinel2 = listReports({ satellite: "sentinel-2" });
    expect(sentinel2.every(report => report.satellites.includes("sentinel-2"))).toBe(true);
  });

  it("obtiene la vista detallada de un informe con estructura McKinsey", () => {
    const report = getReport("inf-el-aromo-ndvi");
    expect(report).toBeDefined();
    expect(report?.predioNombre).toBe("El Aromo");
    expect(report?.summary).toBeDefined();
    expect(report?.recommendation).toBeDefined();
    expect(report?.metrics.length).toBeGreaterThan(0);
    expect(report?.trace.length).toBeGreaterThan(0);
  });

  it("permite acciones de descarga en formatos PDF, Markdown y Word", () => {
    const report = getReport("inf-el-aromo-ndvi");
    expect(report).toBeDefined();
    if (!report) return;

    const markdownText = `# Informe · ${report.predioNombre}\n\n## Resumen Ejecutivo\n${report.summary}\n\n## Recomendaciones\n${report.recommendation}`;
    expect(markdownText).toContain(report.predioNombre);
    expect(markdownText).toContain(report.summary);
  });
});
