import PDFDocument from "pdfkit";
import type { ReportRecord } from "../../shared/report-catalog";

export async function generateReportPdfBuffer(
  report: ReportRecord,
  dataProvenance = "Datos de demostración (Simulador Copernicus)"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // 1. Encabezado / Branding
      doc
        .fillColor("#047857")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("Cleanleaf Intelligence", { align: "left" });

      doc
        .fillColor("#6b7280")
        .fontSize(10)
        .font("Helvetica")
        .text("SaaS de Monitoreo Satelital Agrícola", { align: "left" });

      doc.moveDown(0.5);
      doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // 2. Título e Información Básica
      doc
        .fillColor("#1f2937")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text(`Informe de Monitoreo: ${report.predioNombre}`);

      doc.moveDown(0.3);
      doc
        .fillColor("#4b5563")
        .fontSize(9)
        .font("Helvetica")
        .text(`Organización (Tenant): ${report.tenantId}`)
        .text(`Periodo de análisis: ${report.fechaDesde} — ${report.fechaHasta}`)
        .text(`Fecha de generación: ${report.generatedAt.replace("T", " ").replace("Z", " UTC")}`)
        .text(`Estado: ${report.status === "completado" ? "Informe Listo (100%)" : report.status}`);

      doc.moveDown(1);

      // 3. Resumen Ejecutivo
      doc
        .fillColor("#047857")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Resumen Ejecutivo");

      doc.moveDown(0.3);
      doc
        .fillColor("#374151")
        .fontSize(10)
        .font("Helvetica")
        .text(report.summary || "Resumen del análisis realizado.");

      doc.moveDown(0.8);

      // 4. Recomendación
      doc
        .fillColor("#065f46")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Recomendación Agronómica:");

      doc.moveDown(0.2);
      doc
        .fillColor("#1f2937")
        .fontSize(9.5)
        .font("Helvetica-Oblique")
        .text(report.recommendation || "Sin recomendaciones específicas.");

      doc.moveDown(1.2);

      // 5. Tabla de Métricas Observadas
      doc
        .fillColor("#047857")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Métricas Observadas");

      doc.moveDown(0.4);

      if (report.metrics && report.metrics.length > 0) {
        report.metrics.forEach(metric => {
          doc
            .fillColor("#111827")
            .fontSize(9.5)
            .font("Helvetica-Bold")
            .text(`• ${metric.label}: `, { continued: true })
            .font("Helvetica")
            .fillColor("#059669")
            .text(`${metric.value} `, { continued: true })
            .font("Helvetica")
            .fillColor("#6b7280")
            .text(`(${metric.comparison})`);
        });
      } else {
        doc.fillColor("#6b7280").fontSize(9).text("No se registraron métricas en este periodo.");
      }

      doc.moveDown(1.2);

      // 6. Ficha del Análisis
      doc
        .fillColor("#047857")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Ficha Técnica del Análisis");

      doc.moveDown(0.3);
      doc
        .fillColor("#374151")
        .fontSize(9)
        .font("Helvetica")
        .text(`• Fuentes Satelitales: ${report.satellites.join(", ")}`)
        .text(`• Variables Consultadas: ${report.variables.join(", ")}`)
        .text(`• ID Trazable: ${report.id}`);

      doc.moveDown(1.2);

      // 7. Trazabilidad
      doc
        .fillColor("#047857")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Historial de Trazabilidad");

      doc.moveDown(0.3);

      if (report.trace && report.trace.length > 0) {
        report.trace.forEach(event => {
          doc
            .fillColor("#4b5563")
            .fontSize(8.5)
            .font("Helvetica")
            .text(`[${event.at.slice(0, 16).replace("T", " ")}] ${event.actor.toUpperCase()} · ${event.message}: ${event.detail}`);
        });
      }

      doc.moveDown(2);

      // 8. Aviso de Procedencia de Datos & Pie de Página
      doc.strokeColor("#e5e7eb").lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);

      doc
        .fillColor("#059669")
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text(`Procedencia de Datos: ${dataProvenance}`, { align: "center" });

      doc
        .fillColor("#9ca3af")
        .fontSize(8)
        .font("Helvetica")
        .text("Cleanleaf Satélites — Documento confidencial generado para uso exclusivo del tenant autorizado.", { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
