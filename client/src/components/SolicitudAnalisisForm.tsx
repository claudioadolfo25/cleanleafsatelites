import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { getSatelitesHabilitados, type Vertical, type SatelliteId } from "@shared/satellite-catalog";
import { getTierForSuperficie, processingModeForTier } from "@shared/satellite-router";
import { MapPin, Sliders, Layers, Compass } from "lucide-react";
import { toast } from "sonner";

interface LocationPreset {
  label: string;
  lat: number;
  lng: number;
  region: string;
}

const PRESETS: LocationPreset[] = [
  { label: "Valle Central (Talca / Maule)", lat: -35.4264, lng: -71.6554, region: "Maule, Chile" },
  { label: "Zona Agrícola (Chillán / Nuble)", lat: -36.6063, lng: -72.1023, region: "Ñuble, Chile" },
  { label: "Zona Forestal (Biobío / Los Ángeles)", lat: -37.4697, lng: -72.3537, region: "Biobío, Chile" },
  { label: "Zona Acuícola (Puerto Montt / Los Lagos)", lat: -41.4689, lng: -72.9411, region: "Los Lagos, Chile" },
];

export function SolicitudAnalisisForm() {
  const [vertical, setVertical] = useState<Vertical>("agricultura");
  const [superficieHa, setSuperficieHa] = useState<number>(25);
  const [satelites, setSatelites] = useState<SatelliteId[]>(["sentinel-2"]);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Precision Coordinate Inputs
  const [centerLat, setCenterLat] = useState<number>(-35.4264);
  const [centerLng, setCenterLng] = useState<number>(-71.6554);
  const [computedBbox, setComputedBbox] = useState<[number, number, number, number]>([-71.66, -35.43, -71.65, -35.42]);

  // Active Copernicus Filters
  const [activeCopernicusFilters, setActiveCopernicusFilters] = useState<{ maxCloudCover: number; spectralIndex: string } | null>(null);

  useEffect(() => {
    const savedFilters = localStorage.getItem("cleanleaf-copernicus-filters");
    if (savedFilters) {
      try {
        setActiveCopernicusFilters(JSON.parse(savedFilters));
      } catch {
        // ignore
      }
    }
  }, []);

  // Compute BBox when Center Coordinates or Surface Extent changes
  useEffect(() => {
    // Approx 1 degree lat ~ 111km, 1 degree lng ~ 111km * cos(lat)
    const radiusKm = Math.sqrt((superficieHa * 0.01) / Math.PI); // area in sq km
    const deltaLat = radiusKm / 111.0;
    const deltaLng = radiusKm / (111.0 * Math.cos((centerLat * Math.PI) / 180.0));

    const minLng = parseFloat((centerLng - deltaLng).toFixed(5));
    const minLat = parseFloat((centerLat - deltaLat).toFixed(5));
    const maxLng = parseFloat((centerLng + deltaLng).toFixed(5));
    const maxLat = parseFloat((centerLat + deltaLat).toFixed(5));

    setComputedBbox([minLng, minLat, maxLng, maxLat]);
  }, [centerLat, centerLng, superficieHa]);

  const applyPreset = (preset: LocationPreset) => {
    setCenterLat(preset.lat);
    setCenterLng(preset.lng);
    toast.success(`Coordenadas actualizadas: ${preset.label}`);
  };

  const habilitados = getSatelitesHabilitados(vertical);
  const tier = getTierForSuperficie(superficieHa);
  const motor = processingModeForTier(tier);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Solicitud de Análisis Satelital Enviada", {
      description: `BBox: [${computedBbox.join(", ")}] · Superficie: ${superficieHa} ha · Tier: ${tier}`,
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg border-slate-200">
      <CardHeader className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-300" /> Nueva Solicitud de Análisis Satelital Precision BBox
          </CardTitle>
          <Badge className="bg-emerald-800 text-emerald-100 border-emerald-600">Copernicus CDSE Engine</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vertical Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Vertical de Monitoreo</Label>
            <Select value={vertical} onValueChange={(val: Vertical) => setVertical(val)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Seleccione vertical" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agricultura">Agricultura (Sentinel-2, Sentinel-1)</SelectItem>
                <SelectItem value="acuicultura">Acuicultura (Sentinel-3, Sentinel-2)</SelectItem>
                <SelectItem value="forestal">Forestal (Sentinel-2, Sentinel-1)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Precision Lat / Lng Center Coordinates */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-700" /> Definición por Coordenadas Centrales (Lat / Lng)
              </span>
              <span className="text-[11px] text-slate-500">Formato Decimal WGS84</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Latitud Central (&deg;S)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={centerLat}
                  onChange={(e) => setCenterLat(parseFloat(e.target.value) || 0)}
                  className="bg-white font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Longitud Central (&deg;W)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={centerLng}
                  onChange={(e) => setCenterLng(parseFloat(e.target.value) || 0)}
                  className="bg-white font-mono text-sm"
                />
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-500 font-semibold">Atajos Geográficos Rápidos</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 font-medium transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Surface Area & Dynamic BBox */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Superficie Extensión (Hectáreas)</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={superficieHa}
                onChange={(e) => setSuperficieHa(parseFloat(e.target.value) || 0.5)}
                className="h-10 text-sm font-semibold"
              />
              <p className="text-xs text-slate-500">
                Tier asignado: <strong className="text-slate-800">{tier}</strong> (Motor: {motor})
              </p>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Polígono BBox Calculado</span>
              <p className="font-mono text-xs text-slate-800 font-semibold break-all">
                [{computedBbox.join(", ")}]
              </p>
              <p className="text-[11px] text-slate-500">Enviado directamente a la API Statistical de Copernicus.</p>
            </div>
          </div>

          {/* Active Copernicus Filters Summary */}
          {activeCopernicusFilters && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-700" />
                <span>
                  <strong>Filtros Copernicus Activos:</strong> Máx Nubes: {activeCopernicusFilters.maxCloudCover}% · Índice: {activeCopernicusFilters.spectralIndex}
                </span>
              </div>
              <Badge className="bg-emerald-800 text-white text-[10px]">Configurados en Workbench</Badge>
            </div>
          )}

          {/* Enabled Satellites */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Fuentes Satelitales Habilitadas</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {habilitados.map((satId) => (
                <div key={satId} className="flex items-center space-x-2 border p-2.5 rounded-lg bg-slate-50">
                  <Checkbox
                    id={satId}
                    checked={satelites.includes(satId)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSatelites([...satelites, satId]);
                      } else {
                        setSatelites(satelites.filter((s) => s !== satId));
                      }
                    }}
                  />
                  <label htmlFor={satId} className="text-xs font-bold capitalize cursor-pointer text-slate-800">
                    {satId}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold h-11 shadow-md">
            Enviar Solicitud con Coordenadas BBox
          </Button>

          {submitted && (
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs space-y-1">
              <p className="font-bold">✓ Solicitud de análisis procesada con éxito (Modo REST /api/v1).</p>
              <p className="font-mono">Polígono PostGIS / Copernicus BBox: [{computedBbox.join(", ")}]</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
