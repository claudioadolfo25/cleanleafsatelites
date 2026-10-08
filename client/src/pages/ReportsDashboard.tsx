import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Cloud, Eye, ShieldCheck, Download, Filter, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

interface ReportItem {
  id: string;
  nombrePredio: string;
  lote: string;
  tipoCultivo: string;
  superficieHa: number;
  ndviPromedio: number;
  ndviMin: number;
  ndviMax: number;
  fechaAdquisicion: string;
  porcentajeNubes: number;
  confianzaScore: number;
  confianzaBadge: "Alta Confianza" | "Confianza Baja";
  coordenadasGeoJSON: string;
}

const MOCK_REPORTS: ReportItem[] = [
  {
    id: "lote-maiz-a1",
    nombrePredio: "Fundo El Olivar",
    lote: "Lote Maíz A1",
    tipoCultivo: "Maíz",
    superficieHa: 25,
    ndviPromedio: 0.3774,
    ndviMin: -0.10,
    ndviMax: 0.96,
    fechaAdquisicion: "2026-09-14",
    porcentajeNubes: 0.14,
    confianzaScore: 100,
    confianzaBadge: "Alta Confianza",
    coordenadasGeoJSON: '{"type":"Polygon","coordinates":[[[-70.65,-33.45],[-70.64,-33.45],[-70.64,-33.46],[-70.65,-33.46],[-70.65,-33.45]]]}',
  },
  {
    id: "lote-nogales-b2",
    nombrePredio: "Agrícola Buin",
    lote: "Sector Nogales",
    tipoCultivo: "Nogales",
    superficieHa: 18.2,
    ndviPromedio: 0.3674,
    ndviMin: -0.03,
    ndviMax: 0.86,
    fechaAdquisicion: "2026-09-21",
    porcentajeNubes: 47.12,
    confianzaScore: 72,
    confianzaBadge: "Alta Confianza",
    coordenadasGeoJSON: '{"type":"Polygon","coordinates":[[[-70.70,-33.70],[-70.69,-33.70],[-70.69,-33.71],[-70.70,-33.71],[-70.70,-33.70]]]}',
  },
  {
    id: "lote-cerezos-c3",
    nombrePredio: "Fundo San José",
    lote: "Sector Cerezos",
    tipoCultivo: "Cerezos",
    superficieHa: 30.5,
    ndviPromedio: 0.2150,
    ndviMin: -0.05,
    ndviMax: 0.52,
    fechaAdquisicion: "2026-09-19",
    porcentajeNubes: 78.40,
    confianzaScore: 22,
    confianzaBadge: "Confianza Baja",
    coordenadasGeoJSON: '{"type":"Polygon","coordinates":[[[-70.80,-33.80],[-70.79,-33.80],[-70.79,-33.81],[-70.80,-33.81],[-70.80,-33.80]]]}',
  },
];

export default function ReportsDashboard() {
  const [filterConfidence, setFilterConfidence] = useState<"all" | "high" | "low">("all");
  const [activeMapId, setActiveMapId] = useState<string | null>(null);

  const filteredReports = MOCK_REPORTS.filter((report) => {
    if (filterConfidence === "high") return report.confianzaBadge === "Alta Confianza";
    if (filterConfidence === "low") return report.confianzaBadge === "Confianza Baja";
    return true;
  });

  const handleExportCSV = () => {
    toast.success("Exportando métricas de vegetación en formato CSV...");
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 rounded-2xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-300 border-emerald-500/50 bg-emerald-950">
                PostGIS Polygon Engine
              </Badge>
              <span className="text-xs text-emerald-200/80 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sentinel-2 L2A Cloud Masked
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Centro de Informes Satelitales</h1>
            <p className="text-emerald-100/90 text-sm max-w-2xl">
              Monitoreo continuo de salud vegetal (NDVI), cobertura nubosa SCL y nivel de confianza por lote.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleExportCSV} variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="w-4 h-4 text-emerald-700" /> Filtrar por Nivel de Confianza:
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterConfidence === "all" ? "default" : "outline"}
              className={filterConfidence === "all" ? "bg-emerald-800 text-white" : "text-slate-600"}
              onClick={() => setFilterConfidence("all")}
            >
              Todos ({MOCK_REPORTS.length})
            </Button>
            <Button
              size="sm"
              variant={filterConfidence === "high" ? "default" : "outline"}
              className={filterConfidence === "high" ? "bg-emerald-800 text-white" : "text-slate-600"}
              onClick={() => setFilterConfidence("high")}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Alta Confianza
            </Button>
            <Button
              size="sm"
              variant={filterConfidence === "low" ? "default" : "outline"}
              className={filterConfidence === "low" ? "bg-amber-600 text-white" : "text-slate-600"}
              onClick={() => setFilterConfidence("low")}
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-200" /> Confianza Baja
            </Button>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:border-emerald-500/40 transition-all shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base text-slate-900">{report.nombrePredio}</CardTitle>
                    <CardDescription className="font-semibold text-emerald-800 text-xs">
                      {report.lote}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      report.confianzaBadge === "Alta Confianza"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px]"
                        : "bg-amber-50 text-amber-800 border-amber-300 text-[11px]"
                    }
                  >
                    {report.confianzaBadge} ({report.confianzaScore}%)
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{report.tipoCultivo} • {report.superficieHa} ha</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* NDVI Metric Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">NDVI Promedio</span>
                    <span className="text-xs text-slate-500">Mín: {report.ndviMin.toFixed(2)} | Máx: {report.ndviMax.toFixed(2)}</span>
                  </div>
                  <div className="text-3xl font-black text-emerald-900 tracking-tight">
                    {report.ndviPromedio.toFixed(4)}
                  </div>
                </div>

                {/* Satellite Acquisition Info */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{report.fechaAdquisicion}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-slate-400" />
                    <span>{report.porcentajeNubes.toFixed(2)}% nubes</span>
                  </div>
                </div>

                {/* On-Demand Satellite Map Toggle Viewer */}
                {activeMapId === report.id ? (
                  <div className="space-y-2">
                    <div className="bg-emerald-950 text-emerald-200 text-xs p-3 rounded-lg font-mono border border-emerald-800 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400 animate-spin" />
                      Visualización Processing API Sentinel-2 L2A Activa
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs text-slate-600"
                      onClick={() => setActiveMapId(null)}
                    >
                      Ocultar Capa Satelital
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs border-emerald-300 text-emerald-900 hover:bg-emerald-50"
                      onClick={() => setActiveMapId(report.id)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-emerald-700" /> Ver Mapa Satelital
                    </Button>
                    <Link href={`/dashboard/informes/${report.id}`}>
                      <Button size="sm" className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs px-3">
                        Detalles
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
