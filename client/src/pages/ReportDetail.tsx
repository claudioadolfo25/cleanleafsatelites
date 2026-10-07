import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { satelliteCatalog } from "@shared/satellite-catalog";
import type { AnalysisStatus } from "@shared/analysis-state";
import { ArrowLeft, Check, CheckCircle2, Circle, Clock3, FileBarChart2, History, Info, MapPinned, RefreshCcw, Sparkles, TriangleAlert, Lightbulb, ShieldAlert, CheckSquare } from "lucide-react";
import { Link, useRoute } from "wouter";
import ReportDownloadActions from "@/components/ReportDownloadActions";
import { toast } from "sonner";

const steps: Array<{ status: AnalysisStatus; label: string }> = [
  { status: "pendiente", label: "Solicitud recibida" },
  { status: "en_cola", label: "En cola" },
  { status: "procesando", label: "Procesando fuente" },
  { status: "completado", label: "Informe listo" },
];

const statusLabel: Record<AnalysisStatus, string> = {
  borrador: "Borrador",
  pendiente: "Solicitud recibida",
  en_cola: "En cola",
  procesando: "Procesando",
  completado: "Informe listo",
  error_reintentable: "Fallo temporal",
  error_final: "Fallo definitivo",
  requiere_revision: "Requiere revisión",
  cancelado: "Cancelado",
};

export default function ReportDetail() {
  const [, params] = useRoute("/dashboard/informes/:id");
  const query = trpc.cleanleaf.reports.getById.useQuery({ id: params?.id ?? "" });
  const report = query.data;

  if (query.isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f2] p-8">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="h-12 animate-pulse rounded-xl bg-stone-200" />
          <div className="h-48 animate-pulse rounded-2xl bg-stone-200" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#f7f7f2] p-8 text-center">
        <p className="font-semibold text-stone-700">No encontramos este informe.</p>
        <Link href="/dashboard/informes" className="mt-3 inline-block text-sm font-semibold text-emerald-700">
          Volver a mis informes
        </Link>
      </div>
    );
  }

  const currentStep =
    report.status === "error_reintentable" || report.status === "error_final"
      ? 2
      : report.status === "requiere_revision"
      ? 0
      : steps.findIndex(step => step.status === report.status);

  const isError = report.status === "error_reintentable" || report.status === "error_final";
  const progressColor = isError
    ? "bg-red-500"
    : report.status === "requiere_revision"
    ? "bg-orange-500"
    : report.progress >= 100
    ? "bg-emerald-600"
    : report.progress >= 67
    ? "bg-lime-500"
    : report.progress >= 34
    ? "bg-amber-500"
    : "bg-red-500";

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-stone-800">
      <header className="sticky top-0 z-20 border-b border-[#e6e7dd]/90 bg-[#f7f7f2]/95 px-4 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/dashboard/informes" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-emerald-800">
            <ArrowLeft size={16} /> Todos los informes
          </Link>
          <span className="text-xs font-medium text-stone-400">Trazabilidad de informe · Estructura McKinsey</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 lg:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                <FileBarChart2 size={15} />
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.14em]">Cleanleaf Intelligence Report</span>
            </div>
            <h1 className="font-serif text-4xl tracking-[-0.04em] sm:text-5xl">Informe · {report.predioNombre}</h1>
            <p className="mt-3 text-sm text-stone-500">
              Periodo: {report.fechaDesde} — {report.fechaHasta} · Generado el {report.generatedAt.replace("T", " ").replace("Z", " UTC")}
            </p>
          </div>
          <Badge className={`w-fit px-3 py-1.5 text-xs ${report.status === "completado" ? "bg-emerald-100 text-emerald-700" : isError ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
            {statusLabel[report.status]}
          </Badge>
        </div>

        {/* Status and Progress Stepper */}
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(56,75,44,.5)] sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">Progreso verificable</p>
              <p className="mt-1 text-lg font-bold text-stone-800">{report.currentStep}</p>
            </div>
            <span className={`text-3xl font-bold ${report.status === "completado" ? "text-emerald-600" : isError ? "text-red-600" : report.progress >= 67 ? "text-lime-600" : report.progress >= 34 ? "text-amber-600" : "text-red-600"}`}>
              {report.progress}%
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-100">
            <div className={`h-full rounded-full transition-all duration-700 ${progressColor}`} style={{ width: `${report.progress}%` }} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            {steps.map((step, index) => {
              const done = report.status === "completado" ? true : index < currentStep;
              const active = step.status === report.status || (isError && index === currentStep) || (report.status === "requiere_revision" && index === currentStep);
              return (
                <div key={step.status} className="flex items-center gap-2 sm:block">
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : active ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-400"}`}>
                    {done ? <Check size={15} /> : active ? <Clock3 size={15} /> : <Circle size={12} />}
                  </span>
                  <p className={`mt-0 text-xs font-semibold sm:mt-2 ${done ? "text-emerald-700" : "text-stone-500"}`}>{step.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* McKinsey Structure Layout */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_.85fr]">
          <div className="space-y-6">
            {/* 1. Executive Summary */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-emerald-700" />
                <h2 className="text-lg font-bold text-stone-800">1. Resumen Ejecutivo</h2>
              </div>
              <p className="mt-4 text-base leading-7 text-stone-600">{report.summary}</p>
            </section>

            {/* 2. Key Insights & Findings */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <Lightbulb size={17} className="text-amber-600" />
                <h2 className="text-lg font-bold text-stone-800">2. Hallazgos Clave</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {report.metrics.map(metric => (
                  <li key={metric.label} className="flex items-start gap-3 rounded-xl bg-stone-50 p-3.5">
                    <CheckSquare size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                    <div>
                      <p className="text-xs font-bold text-stone-700">{metric.label}: {metric.value}</p>
                      <p className="mt-0.5 text-xs text-stone-500">{metric.comparison}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* 3. Actionable Recommendations */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-700" />
                <h2 className="text-lg font-bold text-stone-800">3. Recomendaciones Accionables</h2>
              </div>
              <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-800">Acción Prioritaria</p>
                <p className="mt-2 text-sm leading-6 text-stone-700">{report.recommendation}</p>
              </div>
            </section>

            {/* 4. Limitations & Scope */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
              <div className="flex items-center gap-2">
                <ShieldAlert size={17} className="text-stone-500" />
                <h2 className="text-lg font-bold text-stone-800">4. Alcance y Limitaciones declaradas</h2>
              </div>
              <p className="mt-3 text-xs leading-5 text-stone-500">
                Las mediciones satelitales representan promedios de píxel (10m Sentinel-2 / 20m Sentinel-1) y deben complementarse con muestras de campo. En presencia de nubosidad superior al 40%, se utiliza el radar de apertura sintética (Sentinel-1) como respaldo técnico.
              </p>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <MapPinned size={16} className="text-emerald-700" />
                <h2 className="font-bold text-stone-800">Ficha del Análisis</h2>
              </div>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-400">Predio</dt>
                  <dd className="font-semibold text-stone-700">{report.predioNombre}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-400">Fuentes</dt>
                  <dd className="text-right font-semibold text-stone-700">
                    {report.satellites.map(id => satelliteCatalog[id].nombre).join(", ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-400">Variables</dt>
                  <dd className="text-right font-semibold text-stone-700">{report.variables.join(", ")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-400">ID Trazable</dt>
                  <dd className="max-w-[150px] break-all text-right font-mono text-[10px] text-stone-500">{report.id}</dd>
                </div>
              </dl>
              <div className="mt-5">
                <ReportDownloadActions report={report} />
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <History size={16} className="text-emerald-700" />
                <h2 className="font-bold text-stone-800">Trazabilidad</h2>
              </div>
              <div className="mt-5 space-y-0">
                {report.trace.map((event, index) => (
                  <div key={`${event.at}-${event.status}`} className="relative flex gap-3 pb-5 last:pb-0">
                    <div className="relative flex w-4 justify-center">
                      <span className={`z-10 mt-1 h-3 w-3 rounded-full border-2 border-white ${event.status === "completado" ? "bg-emerald-500" : event.status.includes("error") ? "bg-red-500" : "bg-amber-500"}`} />
                      {index < report.trace.length - 1 ? <span className="absolute top-4 h-full w-px bg-stone-200" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-700">{event.message}</p>
                      <p className="mt-1 text-[11px] leading-4 text-stone-500">{event.detail}</p>
                      <p className="mt-1 text-[10px] text-stone-400">{event.actor} · {event.at.replace("T", " ").replace("Z", " UTC")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
