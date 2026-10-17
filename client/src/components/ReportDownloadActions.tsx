import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { ReportRecord } from "@shared/report-catalog";
import { Download, FileCode, FileText, Loader2, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function reportMarkdown(report: ReportRecord) {
  return `# Informe de monitoreo satelital · Cleanleaf\n\n**Predio:** ${report.predioNombre}\n**Periodo:** ${report.fechaDesde} — ${report.fechaHasta}\n**Fuentes:** ${report.satellites.join(", ")}\n**Variables:** ${report.variables.join(", ")}\n**Estado:** ${report.status}\n\n## Resumen ejecutivo\n\n${report.summary}\n\n## Recomendación\n\n${report.recommendation}\n\n## Métricas\n\n${report.metrics.map(metric => `- **${metric.label}:** ${metric.value} · ${metric.comparison}`).join("\n")}\n\n## Trazabilidad\n\n${report.trace.map(event => `- ${event.at} · ${event.actor} · ${event.status} · ${event.message}: ${event.detail}`).join("\n")}\n\n> Los datos y limitaciones deben validarse contra el proveedor satelital configurado.\n`;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportDownloadActions({ report, compact = false }: { report: ReportRecord; compact?: boolean }) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingGeoJson, setDownloadingGeoJson] = useState(false);

  const getDownloadUrlQuery = trpc.cleanleaf.reports.getDownloadUrl.useQuery(
    { id: report.id },
    { enabled: false }
  );

  const getGeoJsonQuery = trpc.cleanleaf.reports.getGeoJson.useQuery(
    { id: report.id },
    { enabled: false }
  );

  const handlePdfDownload = async () => {
    setDownloadingPdf(true);
    try {
      const res = await getDownloadUrlQuery.refetch();
      if (res.data?.downloadUrl) {
        const anchor = document.createElement("a");
        anchor.href = res.data.downloadUrl;
        anchor.download = res.data.filename || `informe-${report.id}.pdf`;
        anchor.target = "_blank";
        anchor.click();
        toast.success("PDF generado exitosamente", { description: "Descarga iniciada desde almacenamiento seguro." });
      } else {
        toast.error("No se pudo obtener la URL del PDF", { description: "Intenta de nuevo más tarde." });
      }
    } catch (err) {
      toast.error("Error al descargar PDF", { description: err instanceof Error ? err.message : "Error de comunicación" });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleGeoJsonDownload = async () => {
    setDownloadingGeoJson(true);
    try {
      const res = await getGeoJsonQuery.refetch();
      if (res.data) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        downloadBlob(jsonStr, `informe-${report.predioNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${report.id}.geojson`, "application/geo+json");
        toast.success("GeoJSON exportado con éxito", { description: "Geometría WGS84 con propiedades de análisis." });
      } else {
        toast.error("No se pudo exportar el GeoJSON");
      }
    } catch (err) {
      toast.error("Error al exportar GeoJSON", { description: err instanceof Error ? err.message : "Error de comunicación" });
    } finally {
      setDownloadingGeoJson(false);
    }
  };

  const handleWordDownload = () => {
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe Cleanleaf</title></head><body><h1>Informe Cleanleaf · ${report.predioNombre}</h1><p><strong>Periodo:</strong> ${report.fechaDesde} a ${report.fechaHasta}</p><h2>Resumen ejecutivo</h2><p>${report.summary}</p><h2>Recomendación</h2><p>${report.recommendation}</p><h2>Métricas</h2><ul>${report.metrics.map(m => `<li><strong>${m.label}:</strong> ${m.value} (${m.comparison})</li>`).join("")}</ul></body></html>`;
    downloadBlob(htmlContent, `informe-${report.id}.doc`, "application/msword");
    toast.success("Documento Word generado");
  };

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "border-t border-stone-100 pt-4"}`}>
      <Button
        variant="outline"
        size="sm"
        disabled={report.status !== "completado" || downloadingPdf}
        onClick={handlePdfDownload}
        className="gap-1.5 rounded-lg border-stone-200 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
      >
        {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
        Descargar PDF
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={report.status !== "completado" || downloadingGeoJson}
        onClick={handleGeoJsonDownload}
        className="gap-1.5 rounded-lg border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-100"
      >
        {downloadingGeoJson ? <Loader2 size={14} className="animate-spin" /> : <FileCode size={14} />}
        GeoJSON
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={report.status !== "completado"}
        onClick={handleWordDownload}
        className="gap-1.5 rounded-lg border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-100"
      >
        <Download size={14} /> Word (.doc)
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={report.status !== "completado"}
        onClick={() => downloadBlob(reportMarkdown(report), `informe-${report.id}.md`, "text/markdown;charset=utf-8")}
        className="gap-1.5 rounded-lg border-stone-200 text-xs text-stone-600"
      >
        <FileText size={14} /> Markdown
      </Button>

      {report.status !== "completado" ? (
        <p className="basis-full text-[11px] text-stone-400">
          Las descargas se habilitan cuando el informe se encuentra procesado (100%).
        </p>
      ) : null}
    </div>
  );
}
