import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VariableChart from "@/components/VariableChart";
import ReportDownloadActions from "@/components/ReportDownloadActions";
import type { SatelliteId } from "@shared/satellite-catalog";
import type { ReportRecord } from "@shared/report-catalog";
import { Calendar, MapPin, Layers, ShieldCheck, ArrowLeft, Activity, CheckCircle2, Cloud } from "lucide-react";
import { Link, useRoute } from "wouter";

const mockReportRecord: ReportRecord = {
  id: "lote-maiz-a1",
  tenantId: "demo-tenant-1",
  predioId: "predio-el-olivar",
  predioNombre: "Fundo El Olivar — Lote Maíz A1",
  fechaDesde: "2026-09-01",
  fechaHasta: "2026-09-14",
  generatedAt: "2026-09-14T12:00:00Z",
  satellites: ["sentinel-2"],
  variables: ["NDVI", "NDWI"],
  status: "completado",
  progress: 100,
  currentStep: "Informe listo",
  alertLevel: "normal",
  summary: "El vigor vegetativo promedio en Lote Maíz A1 alcanzó un NDVI de 0.3774 con 100% de píxeles despejados de nubosidad.",
  recommendation: "El lote muestra desarrollo vegetativo consistente. Se recomienda mantener el programa de riego actual y revisar nuevamente en 5 días.",
  trace: [],
  metrics: [
    { label: "NDVI Promedio", value: "0.3774", comparison: "Estable" },
    { label: "Superficie", value: "25 ha", comparison: "Lote Maíz A1" },
  ],
};

export default function ReportDetail() {
  const [, params] = useRoute("/dashboard/informes/:id");
  const reportId = params?.id || "lote-maiz-a1";
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteId>("sentinel-2");

  const sampleData = {
    "sentinel-2": [
      { fecha: "01 Aug", valor: 0.32 },
      { fecha: "15 Aug", valor: 0.45 },
      { fecha: "01 Sep", valor: 0.58 },
      { fecha: "14 Sep", valor: 0.3774 },
      { fecha: "21 Sep", valor: 0.65 },
    ]
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/informes">
            <Button variant="ghost" className="text-slate-600 hover:text-slate-900 gap-1.5 text-xs font-medium">
              <ArrowLeft className="w-4 h-4" /> Volver al Centro de Informes
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs">
              ID: {reportId}
            </Badge>
          </div>
        </div>

        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 rounded-2xl text-white shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-emerald-300 border-emerald-500/50 bg-emerald-950">
                  Fundo El Olivar
                </Badge>
                <span className="text-xs text-emerald-200/80 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Multi-Tenant PostGIS Polygon
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Lote Maíz A1 — Informe Satelital</h1>
              <p className="text-emerald-100/90 text-sm flex items-center gap-3">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-400" /> Cultivo: Maíz (25 ha)</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-400" /> Captura: 2026-09-14</span>
                <span className="flex items-center gap-1"><Cloud className="w-3.5 h-3.5 text-emerald-400" /> Nubes: 0.14%</span>
              </p>
            </div>

            <ReportDownloadActions report={mockReportRecord} compact={true} />
          </div>
        </div>

        {/* Statistical Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase text-slate-500">NDVI Promedio</CardDescription>
              <CardTitle className="text-3xl font-black text-emerald-900">0.3774</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-emerald-800 font-medium">Salud Vegetal Moderada</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase text-slate-500">Rango Registrado</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-900">-0.10 a 0.96</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">Mínimo (Agua/Sombra) a Máximo Vigor</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase text-slate-500">Confianza Píxel Clear</CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> 100% Alta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">Máscara SCL sin interferencias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase text-slate-500">Motor Procesador</CardDescription>
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-5 h-5 text-teal-700" /> Statistical API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">Copernicus CDSE Tier 1</p>
            </CardContent>
          </Card>
        </div>

        {/* Temporal Evolution Chart */}
        <Card className="border-slate-200/80 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-700" />
              Evolución Temporal de NDVI (Vigor Vegetal)
            </CardTitle>
            <CardDescription>
              Serie temporal de mediciones espectrales Sentinel-2 L2A sobre el polígono del lote.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VariableChart
              data={sampleData}
              selectedSatellite={selectedSatellite}
              onSatelliteChange={setSelectedSatellite}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
