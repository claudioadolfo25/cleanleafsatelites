import type { AnalysisStatus } from "./analysis-state";
import type { SatelliteId } from "./satellite-catalog";

export type ReportTraceEvent = { at: string; actor: string; status: AnalysisStatus; message: string; detail: string };
export type ReportRecord = {
  id: string;
  tenantId: string;
  predioId: string;
  predioNombre: string;
  fechaDesde: string;
  fechaHasta: string;
  generatedAt: string;
  satellites: SatelliteId[];
  variables: string[];
  status: AnalysisStatus;
  progress: number;
  currentStep: string;
  alertLevel: "normal" | "atencion" | "critica";
  summary: string;
  recommendation: string;
  trace: ReportTraceEvent[];
  metrics: Array<{ label: string; value: string; comparison: string }>;
};

const baseTrace = (id: string, status: AnalysisStatus, progress: number, currentStep: string, actor: string, message: string): ReportTraceEvent[] => [
  { at: "2026-09-07T14:18:00Z", actor: "usuario", status: "pendiente", message: "Solicitud creada", detail: `Informe ${id} validado y recibido.` },
  { at: "2026-09-07T14:18:08Z", actor: "workflow", status: "en_cola", message: "Procesamiento aceptado", detail: "La solicitud pasó las validaciones de fuente, variable, tier y plan." },
  { at: "2026-09-07T14:19:22Z", actor: "workflow", status: "procesando", message: "Consultando fuente satelital", detail: "Se está preparando la medición normalizada." },
  ...(status === "completado" ? [{ at: "2026-09-07T14:24:51Z", actor: "workflow", status: "completado" as const, message: "Informe disponible", detail: "Medición, interpretación y recomendación verificadas." }] : [{ at: "2026-09-07T14:20:00Z", actor, status, message, detail: currentStep }]),
];

export const demoReports: ReportRecord[] = [
  { id: "inf-el-aromo-ndvi", tenantId: "tenant-demo", predioId: "predio-el-aromo", predioNombre: "El Aromo", fechaDesde: "2026-08-01", fechaHasta: "2026-08-31", generatedAt: "2026-09-07T14:30:00Z", satellites: ["sentinel-2"], variables: ["NDVI", "NDMI"], status: "completado", progress: 100, currentStep: "Informe listo", alertLevel: "atencion", summary: "El vigor vegetativo disminuyó de forma moderada en el sector sur del predio.", recommendation: "Revisar el sistema de riego y repetir la lectura en 7 días.", trace: baseTrace("inf-el-aromo-ndvi", "completado", 100, "Informe listo", "workflow", "Informe disponible"), metrics: [{ label: "NDVI promedio", value: "0,51", comparison: "−12% vs. julio" }, { label: "NDMI", value: "0,28", comparison: "bajo umbral 0,30" }, { label: "Zona afectada", value: "Sur", comparison: "28% bajo el promedio" }] },
  { id: "inf-las-quinas-radar", tenantId: "tenant-demo", predioId: "predio-las-quinas", predioNombre: "Las Quinas", fechaDesde: "2026-08-24", fechaHasta: "2026-09-05", generatedAt: "2026-09-05T11:15:00Z", satellites: ["sentinel-1"], variables: ["σ⁰ VV", "σ⁰ VH"], status: "completado", progress: 100, currentStep: "Informe listo", alertLevel: "normal", summary: "La señal radar se mantiene estable y no muestra cambios relevantes en humedad superficial.", recommendation: "Mantener el monitoreo semanal y comparar después del próximo riego.", trace: baseTrace("inf-las-quinas-radar", "completado", 100, "Informe listo", "workflow", "Informe disponible"), metrics: [{ label: "σ⁰ VV", value: "−16,8 dB", comparison: "+1,2 dB vs. anterior" }, { label: "σ⁰ VH", value: "−22,1 dB", comparison: "sin cambio material" }, { label: "Calidad", value: "Buena", comparison: "baja nubosidad" }] },
  { id: "inf-santa-elena-ndvi", tenantId: "tenant-demo", predioId: "predio-santa-elena", predioNombre: "Santa Elena", fechaDesde: "2026-08-25", fechaHasta: "2026-09-07", generatedAt: "2026-09-07T15:02:00Z", satellites: ["sentinel-2"], variables: ["NDVI", "EVI"], status: "procesando", progress: 68, currentStep: "Validando mediciones y generando interpretación", alertLevel: "normal", summary: "La medición está siendo procesada; todavía no hay una conclusión final.", recommendation: "El informe estará disponible cuando finalice la validación.", trace: baseTrace("inf-santa-elena-ndvi", "procesando", 68, "Validando mediciones y generando interpretación", "workflow", "Procesamiento en curso"), metrics: [{ label: "Progreso", value: "68%", comparison: "2 de 3 fuentes validadas" }, { label: "Última actividad", value: "Hace 2 min", comparison: "workflow activo" }] },
  { id: "inf-el-aromo-error", tenantId: "tenant-demo", predioId: "predio-el-aromo", predioNombre: "El Aromo", fechaDesde: "2026-08-18", fechaHasta: "2026-08-24", generatedAt: "2026-08-25T09:12:00Z", satellites: ["sentinel-2"], variables: ["NDVI"], status: "error_reintentable", progress: 42, currentStep: "No se encontró una escena óptica utilizable", alertLevel: "critica", summary: "La fuente óptica no tuvo una escena con calidad suficiente para este periodo.", recommendation: "Reintentar con Sentinel-1 o ampliar la ventana de fechas.", trace: baseTrace("inf-el-aromo-error", "error_reintentable", 42, "No se encontró una escena óptica utilizable", "copernicus", "Fallo temporal"), metrics: [{ label: "Progreso", value: "42%", comparison: "detenido por calidad" }, { label: "Reintento", value: "Disponible", comparison: "sin consumo duplicado" }] },
  { id: "inf-regional-review", tenantId: "tenant-demo", predioId: "region-araucania", predioNombre: "Región Araucanía", fechaDesde: "2026-08-01", fechaHasta: "2026-08-31", generatedAt: "2026-08-20T08:40:00Z", satellites: ["sentinel-2"], variables: ["NDVI regional"], status: "requiere_revision", progress: 12, currentStep: "Esperando evaluación del procesamiento regional", alertLevel: "atencion", summary: "El alcance regional supera el procesamiento automático disponible en el plan actual.", recommendation: "Solicitar evaluación antes de iniciar el procesamiento; no se consumió cuota.", trace: [{ at: "2026-08-20T08:40:00Z", actor: "usuario", status: "pendiente", message: "Solicitud recibida", detail: "Se validó el área regional." }, { at: "2026-08-20T08:40:01Z", actor: "policy", status: "requiere_revision", message: "Revisión necesaria", detail: "Tier regional requiere autorización explícita." }], metrics: [{ label: "Área", value: ">5.000 ha", comparison: "tier regional" }, { label: "Consumo", value: "0 ha", comparison: "bloqueado de forma segura" }] },
];

export type ReportFilters = { search?: string; predio?: string; satellite?: string; status?: AnalysisStatus | "todos" };
export function listReports(filters: ReportFilters = {}): ReportRecord[] {
  return demoReports.filter(report => (!filters.search || `${report.predioNombre} ${report.variables.join(" ")}`.toLowerCase().includes(filters.search.toLowerCase())) && (!filters.predio || report.predioNombre === filters.predio) && (!filters.satellite || report.satellites.includes(filters.satellite as SatelliteId)) && (!filters.status || filters.status === "todos" || report.status === filters.status));
}
export function getReport(id: string) { return demoReports.find(report => report.id === id); }
