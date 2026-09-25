import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, MapPin, Eye, Calendar, Cloud, Layers, ShieldCheck, AlertTriangle } from "lucide-react";

interface ParcelCardData {
  id: string;
  predioNombre: string;
  cultivo: string;
  superficieHa: number;
  ndviMean: number;
  minNdvi: number;
  maxNdvi: number;
  validPixelRatio: number;
  status: "SUCCESS" | "LOW_CONFIDENCE" | "NO_DATA";
  fechaAdquisicion: string;
  coberturaNubes: number;
  satelite: string;
}

const mockParcels: ParcelCardData[] = [
  {
    id: "predio-paine-01",
    predioNombre: "Fundo El Olivar — Lote Maíz A1",
    cultivo: "Maíz",
    superficieHa: 25.0,
    ndviMean: 0.3774,
    minNdvi: -0.1002,
    maxNdvi: 0.9586,
    validPixelRatio: 1.0, // 100% despejado
    status: "SUCCESS",
    fechaAdquisicion: "2026-09-14",
    coberturaNubes: 0.14,
    satelite: "Sentinel-2 (L2A)",
  },
  {
    id: "predio-buin-02",
    predioNombre: "Agrícola Buin — Sector Nogales",
    cultivo: "Nogales",
    superficieHa: 18.2,
    ndviMean: 0.3674,
    minNdvi: -0.0264,
    maxNdvi: 0.8567,
    validPixelRatio: 0.718, // 71.8% despejado, 28.2% SCL mask
    status: "SUCCESS",
    fechaAdquisicion: "2026-09-21",
    coberturaNubes: 47.12,
    satelite: "Sentinel-2 (L2A)",
  },
  {
    id: "predio-melipilla-03",
    predioNombre: "Fundo San José — Sector Cerezos",
    cultivo: "Cerezos",
    superficieHa: 30.5,
    ndviMean: 0.215,
    minNdvi: -0.05,
    maxNdvi: 0.52,
    validPixelRatio: 0.22, // 22% despejado < 30% threshold
    status: "LOW_CONFIDENCE",
    fechaAdquisicion: "2026-09-19",
    coberturaNubes: 78.4,
    satelite: "Sentinel-2 (L2A)",
  },
];

export default function ReportsDashboard() {
  const [selectedMapParcel, setSelectedMapParcel] = useState<string | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Monitoreo Satelital de Predios
            </h1>
            <p className="text-gray-500 mt-1">
              Indicadores estadísticos de vegetación (NDVI) promediados por polígono PostGIS.
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1 bg-green-50 text-green-700 border-green-200 text-sm">
            Copernicus CDSE Statistical Engine Active
          </Badge>
        </div>

        {/* Parcel Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockParcels.map((parcel) => (
            <Card key={parcel.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      {parcel.predioNombre}
                    </CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1 text-gray-500 mt-1">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {parcel.cultivo} • {parcel.superficieHa} ha
                    </CardDescription>
                  </div>
                  {parcel.status === "SUCCESS" ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-green-600" />
                      Alta Confianza ({Math.round(parcel.validPixelRatio * 100)}%)
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                      Confianza Baja ({Math.round(parcel.validPixelRatio * 100)}%)
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Primary Metric Widget */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">NDVI Promedio</p>
                    <p className="text-2xl font-bold text-slate-900 mt-0.5">{parcel.ndviMean.toFixed(4)}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500 space-y-0.5">
                    <p>Mín: <span className="font-medium text-slate-700">{parcel.minNdvi.toFixed(2)}</span></p>
                    <p>Máx: <span className="font-medium text-slate-700">{parcel.maxNdvi.toFixed(2)}</span></p>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-100">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{parcel.fechaAdquisicion}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-100">
                    <Cloud className="h-3.5 w-3.5 text-slate-400" />
                    <span>{parcel.coberturaNubes}% nubes</span>
                  </div>
                </div>

                {/* On-Demand Satellite Map View Button */}
                <div className="pt-1">
                  <Button
                    variant="outline"
                    className="w-full text-xs flex items-center justify-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={() => setSelectedMapParcel(selectedMapParcel === parcel.id ? null : parcel.id)}
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                    {selectedMapParcel === parcel.id ? "Ocultar Mapa Satelital" : "Ver Mapa Satelital"}
                  </Button>
                </div>

                {/* Demand-driven Map Panel (Loaded only when clicked) */}
                {selectedMapParcel === parcel.id && (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl space-y-2 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-emerald-900 font-medium">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-emerald-600" /> Visor Processing API
                      </span>
                      <span className="text-[10px] text-emerald-700">Sentinel-2 L2A</span>
                    </div>
                    <div className="h-32 bg-slate-200 rounded-lg flex items-center justify-center border border-slate-300 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 via-green-500/30 to-amber-500/20" />
                      <div className="relative z-10 text-center p-2 bg-white/80 backdrop-blur-sm rounded-md shadow-xs">
                        <p className="font-semibold text-slate-800 text-[11px]">Capa Falso Color NDVI</p>
                        <p className="text-[10px] text-slate-500">Renderizado bajo demanda (Processing API)</p>
                      </div>
                    </div>
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
