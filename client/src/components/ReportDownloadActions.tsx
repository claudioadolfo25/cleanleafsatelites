import { Button } from "@/components/ui/button";
import type { ReportRecord } from "@shared/report-catalog";
import { Download, FileText, Printer } from "lucide-react";

function reportMarkdown(report: ReportRecord) {
  return `# Informe de monitoreo satelital · Cleanleaf\n\n**Predio:** ${report.predioNombre}\n**Periodo:** ${report.fechaDesde} — ${report.fechaHasta}\n**Fuentes:** ${report.satellites.join(", ")}\n**Variables:** ${report.variables.join(", ")}\n**Estado:** ${report.status}\n\n## Resumen ejecutivo\n\n${report.summary}\n\n## Recomendación\n\n${report.recommendation}\n\n## Métricas\n\n${report.metrics.map(metric => `- **${metric.label}:** ${metric.value} · ${metric.comparison}`).join("\n")}\n\n## Trazabilidad\n\n${report.trace.map(event => `- ${event.at} · ${event.actor} · ${event.status} · ${event.message}: ${event.detail}`).join("\n")}\n\n> Los datos y limitaciones deben validarse contra el proveedor satelital configurado.\n`;
}

function download(report: ReportRecord, content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ReportDownloadActions({ report, compact = false }: { report: ReportRecord; compact?: boolean }) {
  return <div className={`flex flex-wrap gap-2 ${compact ? "" : "border-t border-stone-100 pt-4"}`}>
    <Button variant="outline" size="sm" disabled={report.status !== "completado"} onClick={() => download(report, reportMarkdown(report), `${report.id}.md`, "text/markdown;charset=utf-8")} className="gap-1.5 rounded-lg border-stone-200 text-xs"><FileText size={14} /> Markdown</Button>
    <Button variant="outline" size="sm" disabled={report.status !== "completado"} onClick={() => window.print()} className="gap-1.5 rounded-lg border-stone-200 text-xs"><Printer size={14} /> PDF / imprimir</Button>
    <Button variant="outline" size="sm" disabled={report.status !== "completado"} onClick={() => download(report, `<html><body><h1>Informe Cleanleaf · ${report.predioNombre}</h1><h2>Resumen ejecutivo</h2><p>${report.summary}</p><h2>Recomendación</h2><p>${report.recommendation}</p></body></html>`, `${report.id}.doc`, "application/msword")} className="gap-1.5 rounded-lg border-stone-200 text-xs"><Download size={14} /> Word</Button>
    {report.status !== "completado" ? <p className="basis-full text-[11px] text-stone-400">La descarga se habilita cuando el informe llega a 100% y su estado es “Informe listo”.</p> : null}
  </div>;
}
