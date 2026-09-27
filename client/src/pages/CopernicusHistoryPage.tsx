import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  History,
  TrendingUp,
  CloudSun,
  Radio,
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface HistoricalSceneLog {
  id: string;
  date: string;
  mission: "Sentinel-1" | "Sentinel-2" | "Sentinel-3";
  modeOrLevel: string;
  cloudCoverPct: number;
  ndviMean: number;
  validPixelRatio: number;
  status: "ONLINE" | "ARCHIVED";
}

const MOCK_HISTORY_LOGS: HistoricalSceneLog[] = [
  { id: "S2A_MSIL2A_20260920T143000", date: "2026-09-20", mission: "Sentinel-2", modeOrLevel: "Level-2A (L2A)", cloudCoverPct: 4.2, ndviMean: 0.74, validPixelRatio: 0.96, status: "ONLINE" },
  { id: "S1A_IW_GRDH_1SDV_20260918T181000", date: "2026-09-18", mission: "Sentinel-1", modeOrLevel: "IW Level-1 GRD", cloudCoverPct: 0.0, ndviMean: 0.71, validPixelRatio: 1.00, status: "ONLINE" },
  { id: "S2B_MSIL2A_20260915T143000", date: "2026-09-15", mission: "Sentinel-2", modeOrLevel: "Level-2A (L2A)", cloudCoverPct: 18.5, ndviMean: 0.69, validPixelRatio: 0.82, status: "ONLINE" },
  { id: "S2A_MSIL2A_20260910T143000", date: "2026-09-10", mission: "Sentinel-2", modeOrLevel: "Level-2A (L2A)", cloudCoverPct: 42.1, ndviMean: 0.65, validPixelRatio: 0.58, status: "ONLINE" },
  { id: "S1A_IW_GRDH_1SDV_20260906T181000", date: "2026-09-06", mission: "Sentinel-1", modeOrLevel: "IW Level-1 GRD", cloudCoverPct: 0.0, ndviMean: 0.64, validPixelRatio: 1.00, status: "ONLINE" },
  { id: "S2B_MSIL2A_20260901T143000", date: "2026-09-01", mission: "Sentinel-2", modeOrLevel: "Level-2A (L2A)", cloudCoverPct: 2.1, ndviMean: 0.62, validPixelRatio: 0.98, status: "ONLINE" },
];

export default function CopernicusHistoryPage() {
  const [selectedRange, setSelectedRange] = useState<string>("30d");
  const [logs] = useState<HistoricalSceneLog[]>(MOCK_HISTORY_LOGS);

  const exportCsv = () => {
    toast.success("Serie Histórica Exportada en CSV", {
      description: `Se descargó el registro de ${logs.length} escenas satelitales procesadas.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 p-8 rounded-2xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-300 border-emerald-500/50 bg-emerald-950 font-mono text-xs">
                Copernicus Historical Workspace
              </Badge>
              <span className="text-xs text-emerald-200/80 flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-emerald-400" /> Serie Temporal & Trazabilidad de Escenas
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Históricos & Workspace Satelital</h1>
            <p className="text-emerald-100/90 text-sm max-w-3xl leading-relaxed">
              Consola de seguimiento temporal de pasadas satelitales. Compare evoluciones de NDVI, humedad de suelo radar y registros SCL en el tiempo.
            </p>
          </div>

          <Button onClick={exportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">
            <Download className="mr-2 h-4 w-4" /> Exportar Serie Temporal CSV
          </Button>
        </div>

        {/* Time-Series Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Escenas Procesadas</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{logs.length} Pasadas</h3>
                <p className="text-[11px] text-emerald-700 font-medium mt-1">100% Cobertura CDSE</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">NDVI Máximo Registrado</p>
                <h3 className="text-2xl font-bold text-emerald-800 mt-1">0.74</h3>
                <p className="text-[11px] text-slate-500 mt-1">20 de Septiembre de 2026</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Promedio Píxeles Claros</p>
                <h3 className="text-2xl font-bold text-sky-800 mt-1">89.2%</h3>
                <p className="text-[11px] text-sky-700 font-medium mt-1">SCL Mask Filtrado</p>
              </div>
              <div className="p-3 bg-sky-50 text-sky-800 rounded-xl">
                <CloudSun className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Revisita Promedio</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">3.8 Días</h3>
                <p className="text-[11px] text-slate-500 mt-1">Sentinel-2A + 2B + 1A</p>
              </div>
              <div className="p-3 bg-slate-100 text-slate-800 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historical Logs Table */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-700" /> Registro Histórico de Escenas Satelitales
                </CardTitle>
                <CardDescription className="text-xs">
                  Historial de pasadas procesadas por el motor Copernicus para el predio activo.
                </CardDescription>
              </div>

              <div className="w-48">
                <Select value={selectedRange} onValueChange={setSelectedRange}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30d">Últimos 30 días</SelectItem>
                    <SelectItem value="90d">Últimos 90 días</SelectItem>
                    <SelectItem value="1y">Año Completo (2026)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">ID Escena CDSE</th>
                  <th className="p-4">Fecha Pasada</th>
                  <th className="p-4">Misión Satelital</th>
                  <th className="p-4">Nivel / Modo</th>
                  <th className="p-4">Nubes (%)</th>
                  <th className="p-4">NDVI Prom.</th>
                  <th className="p-4">Píxeles Válidos</th>
                  <th className="p-4">Estado CDSE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-bold text-slate-900 text-[11px] truncate max-w-[200px]">{log.id}</td>
                    <td className="p-4 text-slate-800">{log.date}</td>
                    <td className="p-4 font-sans font-semibold text-slate-800">{log.mission}</td>
                    <td className="p-4 font-sans text-slate-600">{log.modeOrLevel}</td>
                    <td className="p-4">{log.cloudCoverPct}%</td>
                    <td className="p-4 font-bold text-emerald-800">{log.ndviMean.toFixed(2)}</td>
                    <td className="p-4 font-bold text-slate-800">{(log.validPixelRatio * 100).toFixed(0)}%</td>
                    <td className="p-4 font-sans">
                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-mono text-[10px]">
                        {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
