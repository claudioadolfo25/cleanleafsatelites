import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Satellite,
  Layers,
  MapPin,
  Sliders,
  ShieldCheck,
  Radio,
  CloudSun,
  ThermometerSun,
  Search,
  Compass,
} from "lucide-react";
import { toast } from "sonner";

type SatelliteMission = "sentinel-1" | "sentinel-2" | "sentinel-3";

interface Sentinel1FilterState {
  mode: "IW" | "EW" | "SM" | "WV";
  level: "Level-0 RAW" | "Level-1 SLC" | "Level-1 GRD" | "Level-1 GRD COG" | "Level-2 OCN" | "ETAD" | "Auxiliary Data File";
  polarization: "VV" | "VH" | "VV+VH" | "HH" | "HV" | "HH+HV";
  direction: "ASCENDING" | "DESCENDING" | "BOTH";
  relativeOrbit: string;
  platformSeries: "S1A" | "S1B" | "ALL";
  availabilityStatus: "ONLINE" | "OFFLINE" | "ALL";
}

interface Sentinel2FilterState {
  sensor: "MSI";
  level: "L1C" | "L2A" | "Auxiliary Data File" | "Immediate";
  maxCloudCover: number;
  platformSeries: "S2A" | "S2B" | "ALL";
  relativeOrbit: string;
  availabilityStatus: "ONLINE" | "OFFLINE" | "ALL";
  spectralIndex: "NDVI" | "NDWI" | "EVI" | "SAVI" | "NDMI" | "NBR";
  bandComposite: "true_color" | "false_color_ir" | "agriculture" | "geology";
}

interface Sentinel3FilterState {
  instrument: "OLCI" | "SRAL" | "SLSTR" | "SYNERGY" | "Demo Products" | "Auxiliary Data File";
  timeliness: "NRT (Near Real Time)" | "STC (Short Time Critical)" | "NTC (Non Time Critical)";
  platformSeries: "S3A" | "S3B" | "ALL";
  direction: "ASCENDING" | "DESCENDING" | "BOTH";
  relativeOrbit: string;
  parameter: "Chlorophyll-a" | "Turbidity" | "LST_Thermal" | "SST_Ocean";
}

export default function CopernicusWorkstationPage() {
  const [selectedMission, setSelectedMission] = useState<SatelliteMission>("sentinel-1");

  // Sentinel-1 Filters
  const [s1Filters, setS1Filters] = useState<Sentinel1FilterState>({
    mode: "IW",
    level: "Level-1 GRD",
    polarization: "VV+VH",
    direction: "BOTH",
    relativeOrbit: "1-175",
    platformSeries: "ALL",
    availabilityStatus: "ONLINE",
  });

  // Sentinel-2 Filters
  const [s2Filters, setS2Filters] = useState<Sentinel2FilterState>({
    sensor: "MSI",
    level: "L2A",
    maxCloudCover: 20,
    platformSeries: "ALL",
    relativeOrbit: "1-143",
    availabilityStatus: "ONLINE",
    spectralIndex: "NDVI",
    bandComposite: "true_color",
  });

  // Sentinel-3 Filters
  const [s3Filters, setS3Filters] = useState<Sentinel3FilterState>({
    instrument: "OLCI",
    timeliness: "NRT (Near Real Time)",
    platformSeries: "ALL",
    direction: "BOTH",
    relativeOrbit: "1-385",
    parameter: "Chlorophyll-a",
  });

  // Coordinates BBox
  const [centerLat, setCenterLat] = useState<number>(-35.4264);
  const [centerLng, setCenterLng] = useState<number>(-71.6554);

  const handleSearchScenes = () => {
    toast.success(`Búsqueda CDSE Ejecutada para ${selectedMission.toUpperCase()}`, {
      description: `Filtros procesados contra Copernicus STAC Catalog API.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-8 rounded-2xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-300 border-emerald-500/50 bg-emerald-950 font-mono text-xs">
                Copernicus EO Browser Workstation
              </Badge>
              <span className="text-xs text-emerald-200/80 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Catalog STAC & Processing Specs
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Estación de Trabajo Satelital Copernicus EO Browser</h1>
            <p className="text-emerald-100/90 text-sm max-w-3xl leading-relaxed">
              Consola de exploración satelital avanzada basada en las especificaciones oficiales de Copernicus Data Space Ecosystem. Configure modos, instrumentos, puntualidad y parámetros orbitales exactos por misión.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSearchScenes} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">
              <Search className="mr-2 h-4 w-4" /> Buscar Escenas CDSE
            </Button>
          </div>
        </div>

        {/* Mission Dropdown Selector Header */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Satellite className="w-4 h-4 text-emerald-700" /> Misión Satelital Principal
                </label>
                <p className="text-xs text-slate-600">Seleccione la constelación Copernicus para activar sus filtros y especificaciones exactas.</p>
              </div>

              <div className="w-full md:w-80">
                <Select value={selectedMission} onValueChange={(val: SatelliteMission) => setSelectedMission(val)}>
                  <SelectTrigger className="h-11 font-bold text-sm bg-slate-50 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sentinel-1">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-sky-600" />
                        <span>SENTINEL-1 (Radar C-SAR)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sentinel-2">
                      <div className="flex items-center gap-2">
                        <CloudSun className="w-4 h-4 text-emerald-600" />
                        <span>SENTINEL-2 (Multiespectral MSI)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sentinel-3">
                      <div className="flex items-center gap-2">
                        <ThermometerSun className="w-4 h-4 text-amber-600" />
                        <span>SENTINEL-3 (OLCI / SLSTR / SRAL)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Satellite Technical Specifications Card */}
        {selectedMission === "sentinel-1" && (
          <Card className="border-sky-200 bg-sky-50/40 shadow-sm">
            <CardHeader className="pb-3 border-b border-sky-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-5 h-5 text-sky-700" />
                  <CardTitle className="text-lg text-slate-900">SENTINEL-1 Radar C-SAR Especificaciones Técnicas</CardTitle>
                </div>
                <Badge className="bg-sky-800 text-white font-mono text-xs">C-SAR Radar</Badge>
              </div>
              <CardDescription className="text-slate-700 text-xs">
                Imágenes de radar obtenidas en cualesquiera condiciones meteorológicas, de día o de noche, de tierra y mar. EO Browser da acceso a datos en modos IW (interferometric wide swath) y EW (extra-wide swath), procesados al Nivel 1 GRD.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-white rounded-xl border border-sky-100">
                <span className="text-slate-400 font-bold block mb-0.5">Pixel Spacing (Resolución)</span>
                <span className="font-semibold text-slate-900">10 m (IW) · 40 m (EW)</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-sky-100">
                <span className="text-slate-400 font-bold block mb-0.5">Tiempo de Revisita</span>
                <span className="font-semibold text-slate-900">&le; 5 días (ambos satélites) · &le; 3 días (superposición)</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-sky-100">
                <span className="text-slate-400 font-bold block mb-0.5">Disponibilidad de Datos</span>
                <span className="font-semibold text-slate-900">Desde Octubre de 2014 (Histórico Continuo)</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-sky-100">
                <span className="text-slate-400 font-bold block mb-0.5">Uso Habitual</span>
                <span className="font-semibold text-slate-900">Monitorización de territorio/mares, emergencias, cambio climático</span>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedMission === "sentinel-2" && (
          <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
            <CardHeader className="pb-3 border-b border-emerald-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudSun className="w-5 h-5 text-emerald-700" />
                  <CardTitle className="text-lg text-slate-900">SENTINEL-2 Instrumento Multiespectral MSI Especificaciones</CardTitle>
                </div>
                <Badge className="bg-emerald-800 text-white font-mono text-xs">Optico MSI 13 Bandas</Badge>
              </div>
              <CardDescription className="text-slate-700 text-xs">
                Captura óptica multiespectral de alta resolución espacial en bandas VIS, NIR y SWIR para monitoreo de agricultura, bosques y vegetación.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-slate-400 font-bold block mb-0.5">Pixel Spacing (Resolución)</span>
                <span className="font-semibold text-slate-900">10 m (B2, B3, B4, B8) · 20 m (B5-B7, SWIR)</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-slate-400 font-bold block mb-0.5">Tiempo de Revisita</span>
                <span className="font-semibold text-slate-900">5 días en el ecuador (constelación S2A + S2B)</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-slate-400 font-bold block mb-0.5">Disponibilidad de Datos</span>
                <span className="font-semibold text-slate-900">Desde Junio de 2015</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <span className="text-slate-400 font-bold block mb-0.5">Filtros de Cobertura Nubosa</span>
                <span className="font-semibold text-slate-900">0% – 100% (STAC Catalog Filter)</span>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedMission === "sentinel-3" && (
          <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
            <CardHeader className="pb-3 border-b border-amber-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ThermometerSun className="w-5 h-5 text-amber-700" />
                  <CardTitle className="text-lg text-slate-900">SENTINEL-3 Instrumentos OLCI / SLSTR / SRAL / SYNERGY</CardTitle>
                </div>
                <Badge className="bg-amber-800 text-white font-mono text-xs">Oceánico & Térmico</Badge>
              </div>
              <CardDescription className="text-slate-700 text-xs">
                Mediciones de color de la tierra y océanos, altimetría topography y temperatura de la superficie terrestre/marina.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-white rounded-xl border border-amber-100">
                <span className="text-slate-400 font-bold block mb-0.5">Pixel Spacing (Resolución)</span>
                <span className="font-semibold text-slate-900">300 m (OLCI) · 1 km (SLSTR Térmico)</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-100">
                <span className="text-slate-400 font-bold block mb-0.5">Tiempo de Revisita</span>
                <span className="font-semibold text-slate-900">&le; 2 días para OLCI / SLSTR</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-100">
                <span className="text-slate-400 font-bold block mb-0.5">Disponibilidad de Datos</span>
                <span className="font-semibold text-slate-900">Desde Febrero de 2016</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-100">
                <span className="text-slate-400 font-bold block mb-0.5">Puntualidad</span>
                <span className="font-semibold text-slate-900">NRT (Near Real Time) · STC · NTC</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Granular Filters Workbench for Selected Satellite */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-800" />
              <h2 className="text-lg font-bold text-slate-900">Filtros Oficiales Copernicus para {selectedMission.toUpperCase()}</h2>
            </div>
            <Badge variant="outline" className="border-slate-300 text-slate-700 font-mono text-xs">
              CDSE Query Builder
            </Badge>
          </div>

          {/* Sentinel-1 Granular Filters */}
          {selectedMission === "sentinel-1" && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Modo Operativo (Acquisition Mode)</Label>
                <Select value={s1Filters.mode} onValueChange={(val: Sentinel1FilterState["mode"]) => setS1Filters({ ...s1Filters, mode: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IW">IW - Interferometric Wide Swath</SelectItem>
                    <SelectItem value="EW">EW - Extra-Wide Swath</SelectItem>
                    <SelectItem value="SM">SM - Stripmap</SelectItem>
                    <SelectItem value="WV">WV - Wave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Nivel de Procesamiento (Product Level)</Label>
                <Select value={s1Filters.level} onValueChange={(val: Sentinel1FilterState["level"]) => setS1Filters({ ...s1Filters, level: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Level-0 RAW">Level-0 RAW</SelectItem>
                    <SelectItem value="Level-1 SLC">Level-1 SLC</SelectItem>
                    <SelectItem value="Level-1 GRD">Level-1 GRD</SelectItem>
                    <SelectItem value="Level-1 GRD COG">Level-1 GRD COG</SelectItem>
                    <SelectItem value="Level-2 OCN">Level-2 OCN</SelectItem>
                    <SelectItem value="ETAD">ETAD</SelectItem>
                    <SelectItem value="Auxiliary Data File">Auxiliary Data File</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Canales de Polarización</Label>
                <Select value={s1Filters.polarization} onValueChange={(val: Sentinel1FilterState["polarization"]) => setS1Filters({ ...s1Filters, polarization: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VV+VH">Dual VV+VH</SelectItem>
                    <SelectItem value="VV">Single VV</SelectItem>
                    <SelectItem value="VH">Single VH</SelectItem>
                    <SelectItem value="HH+HV">Dual HH+HV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Identificación de la Serie Plataforma</Label>
                <Select value={s1Filters.platformSeries} onValueChange={(val: Sentinel1FilterState["platformSeries"]) => setS1Filters({ ...s1Filters, platformSeries: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas (S1A + S1B)</SelectItem>
                    <SelectItem value="S1A">SENTINEL-1A</SelectItem>
                    <SelectItem value="S1B">SENTINEL-1B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Dirección Orbital</Label>
                <Select value={s1Filters.direction} onValueChange={(val: Sentinel1FilterState["direction"]) => setS1Filters({ ...s1Filters, direction: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOTH">Ambas (Ascendente y Descendente)</SelectItem>
                    <SelectItem value="ASCENDING">Ascendente</SelectItem>
                    <SelectItem value="DESCENDING">Descendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Número Relativo de Órbita (1-175)</Label>
                <Input
                  type="text"
                  value={s1Filters.relativeOrbit}
                  onChange={(e) => setS1Filters({ ...s1Filters, relativeOrbit: e.target.value })}
                  className="h-10 font-mono text-sm"
                  placeholder="1-175"
                />
              </div>
            </div>
          )}

          {/* Sentinel-2 Granular Filters */}
          {selectedMission === "sentinel-2" && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Instrumento</Label>
                <Select value={s2Filters.sensor} onValueChange={(val: Sentinel2FilterState["sensor"]) => setS2Filters({ ...s2Filters, sensor: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MSI">MSI - Multispectral Instrument</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Nivel de Producto / Filtros</Label>
                <Select value={s2Filters.level} onValueChange={(val: Sentinel2FilterState["level"]) => setS2Filters({ ...s2Filters, level: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L2A">L2A - Bottom of Atmosphere (BOA)</SelectItem>
                    <SelectItem value="L1C">L1C - Top of Atmosphere (TOA)</SelectItem>
                    <SelectItem value="Auxiliary Data File">Auxiliary Data File</SelectItem>
                    <SelectItem value="Immediate">Immediate / NRT Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex justify-between">
                  <span>Cobertura Nubosa Máxima (0% - 100%)</span>
                  <span className="font-mono font-bold text-emerald-800">{s2Filters.maxCloudCover}%</span>
                </Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={s2Filters.maxCloudCover}
                  onChange={(e) => setS2Filters({ ...s2Filters, maxCloudCover: parseInt(e.target.value) })}
                  className="w-full accent-emerald-800 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Plataforma Serie</Label>
                <Select value={s2Filters.platformSeries} onValueChange={(val: Sentinel2FilterState["platformSeries"]) => setS2Filters({ ...s2Filters, platformSeries: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas (S2A + S2B)</SelectItem>
                    <SelectItem value="S2A">SENTINEL-2A</SelectItem>
                    <SelectItem value="S2B">SENTINEL-2B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Número Relativo de Órbita (1-143)</Label>
                <Input
                  type="text"
                  value={s2Filters.relativeOrbit}
                  onChange={(e) => setS2Filters({ ...s2Filters, relativeOrbit: e.target.value })}
                  className="h-10 font-mono text-sm"
                  placeholder="1-143"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Disponibilidad</Label>
                <Select value={s2Filters.availabilityStatus} onValueChange={(val: Sentinel2FilterState["availabilityStatus"]) => setS2Filters({ ...s2Filters, availabilityStatus: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONLINE">Online (Acceso Directo CDSE)</SelectItem>
                    <SelectItem value="ALL">All (Archivo Histórico)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Sentinel-3 Granular Filters */}
          {selectedMission === "sentinel-3" && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Instrumento</Label>
                <Select value={s3Filters.instrument} onValueChange={(val: Sentinel3FilterState["instrument"]) => setS3Filters({ ...s3Filters, instrument: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OLCI">OLCI - Ocean and Land Colour Instrument</SelectItem>
                    <SelectItem value="SLSTR">SLSTR - Sea and Land Surface Temperature</SelectItem>
                    <SelectItem value="SRAL">SRAL - Synthetic Aperture Radar Altimeter</SelectItem>
                    <SelectItem value="SYNERGY">SYNERGY - Product Combination</SelectItem>
                    <SelectItem value="Demo Products">Demo Products</SelectItem>
                    <SelectItem value="Auxiliary Data File">Auxiliary Data File</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Puntualidad (Timeliness)</Label>
                <Select value={s3Filters.timeliness} onValueChange={(val: Sentinel3FilterState["timeliness"]) => setS3Filters({ ...s3Filters, timeliness: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NRT (Near Real Time)">NRT (Near Real Time)</SelectItem>
                    <SelectItem value="STC (Short Time Critical)">STC (Short Time Critical)</SelectItem>
                    <SelectItem value="NTC (Non Time Critical)">NTC (Non Time Critical)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Plataforma Serie</Label>
                <Select value={s3Filters.platformSeries} onValueChange={(val: Sentinel3FilterState["platformSeries"]) => setS3Filters({ ...s3Filters, platformSeries: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas (S3A + S3B)</SelectItem>
                    <SelectItem value="S3A">SENTINEL-3A</SelectItem>
                    <SelectItem value="S3B">SENTINEL-3B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Dirección Orbital</Label>
                <Select value={s3Filters.direction} onValueChange={(val: Sentinel3FilterState["direction"]) => setS3Filters({ ...s3Filters, direction: val })}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOTH">Ambas (Ascendente y Descendente)</SelectItem>
                    <SelectItem value="ASCENDING">Ascendente</SelectItem>
                    <SelectItem value="DESCENDING">Descendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Número Relativo de Órbita</Label>
                <Input
                  type="text"
                  value={s3Filters.relativeOrbit}
                  onChange={(e) => setS3Filters({ ...s3Filters, relativeOrbit: e.target.value })}
                  className="h-10 font-mono text-sm"
                  placeholder="1-385"
                />
              </div>
            </div>
          )}
        </section>

        {/* Spatial BBox Explorer & Map Placeholder */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" /> Delimitación BBox de Búsqueda
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="space-y-2">
                <Label className="text-slate-600">Latitud Central (&deg;S)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={centerLat}
                  onChange={(e) => setCenterLat(parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-600">Longitud Central (&deg;W)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={centerLng}
                  onChange={(e) => setCenterLng(parseFloat(e.target.value) || 0)}
                  className="font-mono"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
                <span className="text-slate-500 font-bold block">WKT Bounding Box</span>
                <p className="text-slate-800 break-all">
                  POLYGON(({centerLng-0.02} {centerLat-0.02}, {centerLng+0.02} {centerLat-0.02}, {centerLng+0.02} {centerLat+0.02}, {centerLng-0.02} {centerLat+0.02}))
                </p>
              </div>

              <Button onClick={handleSearchScenes} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10">
                Ejecutar Query STAC
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-slate-200 shadow-sm bg-slate-900 text-white flex flex-col justify-between overflow-hidden">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  <CardTitle className="text-base">Visor de Mapa Satelital EO Browser</CardTitle>
                </div>
                <Badge className="bg-emerald-800 text-emerald-100 border-emerald-600 font-mono text-xs">
                  Copernicus CDSE Tiles
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-8 flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-full bg-slate-800 border border-slate-700 text-emerald-400">
                <Compass className="w-10 h-10 animate-pulse" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="font-bold text-lg text-white">Consola de Renderizado de Capas Satelitales</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Las capas procesadas con la especificación activa de <strong>{selectedMission.toUpperCase()}</strong> ({s1Filters.level || s2Filters.level || s3Filters.instrument}) se renderizarán sobre las coordenadas ({centerLat}, {centerLng}).
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
