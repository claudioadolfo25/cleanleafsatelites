import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { satelliteCatalog, type SatelliteId, type Vertical } from "@shared/satellite-catalog";
import { guidanceForNeed, needOptions, satelliteGuidance, type NeedId } from "@shared/satellite-guidance";
import { Check, CloudSun, Info, Leaf, Radio, Save, Sparkles, ThermometerSun, ShieldCheck, Sliders, Layers, Eye } from "lucide-react";
import { toast } from "sonner";

const icons = { "sentinel-1": Radio, "sentinel-2": CloudSun, "sentinel-3": ThermometerSun };
const activeForMvp: SatelliteId[] = ["sentinel-1", "sentinel-2"];
type ConfigSector = Vertical | "emergencias";

export interface CopernicusFilterState {
  maxCloudCover: number;
  spectralIndex: "NDVI" | "NDWI" | "EVI" | "RADAR_MOISTURE" | "LST_THERMAL";
  bandPreset: "true_color" | "false_color_ir" | "agriculture" | "soil_moisture";
  revisitDaysMax: number;
}

function activeForVertical(vertical: ConfigSector): SatelliteId[] {
  if (vertical === "acuicultura") return ["sentinel-2"];
  if (vertical === "emergencias") return [];
  return activeForMvp;
}

export default function SatelliteConfiguration() {
  const [vertical, setVertical] = useState<ConfigSector>("agricultura");
  const [need, setNeed] = useState<NeedId>("nubosidad");
  const [selected, setSelected] = useState<SatelliteId[]>(["sentinel-2", "sentinel-1"]);

  // Copernicus CDSE Filter Workbench State
  const [filters, setFilters] = useState<CopernicusFilterState>({
    maxCloudCover: 20,
    spectralIndex: "NDVI",
    bandPreset: "true_color",
    revisitDaysMax: 5,
  });

  const recommendation = useMemo(() => guidanceForNeed(need), [need]);
  const visibleNeeds = needOptions.filter(option => option.verticals.includes(vertical));
  const activeSources = activeForVertical(vertical);

  useEffect(() => {
    const saved = localStorage.getItem("cleanleaf-satellite-preferences");
    if (saved) {
      try {
        const preferences = JSON.parse(saved) as { vertical?: ConfigSector; need?: NeedId; selected?: SatelliteId[] };
        if (preferences.vertical) setVertical(preferences.vertical);
        if (preferences.need) setNeed(preferences.need);
        if (preferences.selected?.length) setSelected(preferences.selected);
      } catch {
        localStorage.removeItem("cleanleaf-satellite-preferences");
      }
    }

    const savedFilters = localStorage.getItem("cleanleaf-copernicus-filters");
    if (savedFilters) {
      try {
        setFilters(JSON.parse(savedFilters));
      } catch {
        localStorage.removeItem("cleanleaf-copernicus-filters");
      }
    }
  }, []);

  useEffect(() => {
    setSelected(current => current.filter(id => activeSources.includes(id)));
  }, [vertical]);

  const toggle = (id: SatelliteId) => {
    if (!activeSources.includes(id)) {
      toast.info("Disponible en Fase 2", { description: "Este recurso se muestra para orientar la decisión, pero aún no se activa para solicitudes productivas." });
      return;
    }
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const applyRecommendation = () => {
    const next = recommendation.recommendations.filter(id => activeSources.includes(id));
    if (next.length === 0) {
      toast.info("Recomendación en Fase 2", { description: recommendation.explanation });
      return;
    }
    setSelected(next);
    toast.success("Recomendación aplicada", { description: recommendation.explanation });
  };

  const save = () => {
    localStorage.setItem("cleanleaf-satellite-preferences", JSON.stringify({ vertical, need, selected }));
    localStorage.setItem("cleanleaf-copernicus-filters", JSON.stringify(filters));
    toast.success("Configuración y Filtros Guardados", { description: "Tus parámetros Copernicus y preferencias de satélite regirán tus solicitudes de análisis." });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 rounded-2xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-300 border-emerald-500/50 bg-emerald-950">
                Copernicus CDSE Workbench
              </Badge>
              <span className="text-xs text-emerald-200/80 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Filtros y Misiones Activas
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Workbench de Filtros Satelitales Copernicus</h1>
            <p className="text-emerald-100/90 text-sm max-w-2xl">
              Ajuste umbrales de nubosidad, combinación de bandas, índices espectrales y frecuencia de revisita para gobernar el motor de procesamiento.
            </p>
          </div>

          <Button onClick={save} className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-md">
            <Save className="mr-2 h-4 w-4" /> Guardar Filtros & Preferencias
          </Button>
        </div>

        {/* Copernicus CDSE Filter Workbench */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">Parámetros de Procesamiento Satelital</h2>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-900 font-mono text-xs">
              SCL Cloud Mask Enabled
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Cloud Cover Slider */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex justify-between">
                <span>Máx. Cobertura Nubosa</span>
                <span className="text-emerald-800 font-mono font-bold">{filters.maxCloudCover}%</span>
              </label>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={filters.maxCloudCover}
                onChange={(e) => setFilters({ ...filters, maxCloudCover: parseInt(e.target.value) })}
                className="w-full accent-emerald-800 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <p className="text-[11px] text-slate-500">Imágenes con nubes superiores al {filters.maxCloudCover}% serán descartadas por STAC Catalog.</p>
            </div>

            {/* Spectral Index Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Índice Espectral Principal</label>
              <Select
                value={filters.spectralIndex}
                onValueChange={(val: CopernicusFilterState["spectralIndex"]) => setFilters({ ...filters, spectralIndex: val })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NDVI">NDVI - Vigor Vegetal (NIR/Red)</SelectItem>
                  <SelectItem value="NDWI">NDWI - Estrés Hídrico (NIR/SWIR)</SelectItem>
                  <SelectItem value="EVI">EVI - Densidad Foliar Alta</SelectItem>
                  <SelectItem value="RADAR_MOISTURE">VV/VH - Humedad Suelo Radar</SelectItem>
                  <SelectItem value="LST_THERMAL">LST - Temperatura Terrestre</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">Determina la capa de análisis prioritaria en el cálculo estadístico.</p>
            </div>

            {/* Band Composite Preset */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Combinación de Bandas</label>
              <Select
                value={filters.bandPreset}
                onValueChange={(val: CopernicusFilterState["bandPreset"]) => setFilters({ ...filters, bandPreset: val })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true_color">Color Real (B4, B3, B2)</SelectItem>
                  <SelectItem value="false_color_ir">Infrarrojo Color (B8, B4, B3)</SelectItem>
                  <SelectItem value="agriculture">Agrícola (B11, B8, B2)</SelectItem>
                  <SelectItem value="soil_moisture">Humedad de Suelo (B12, B8, B4)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">Define las bandas espectrales para renderizar mapas de calor.</p>
            </div>

            {/* Revisit Days Max */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Máx. Frecuencia Revisita</label>
              <Select
                value={filters.revisitDaysMax.toString()}
                onValueChange={(val) => setFilters({ ...filters, revisitDaysMax: parseInt(val) })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Hasta 3 días (Alta Frecuencia)</SelectItem>
                  <SelectItem value="5">Hasta 5 días (Sentinel-2 Estándar)</SelectItem>
                  <SelectItem value="10">Hasta 10 días (Histórico Extendido)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">Rango de tiempo máximo entre pasadas satelitales.</p>
            </div>
          </div>
        </section>

        {/* Sector and Need Selector */}
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[220px_1fr]">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Sector Agrícola</label>
            <Select value={vertical} onValueChange={value => setVertical(value as ConfigSector)}>
              <SelectTrigger className="mt-2 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agricultura">Agricultura</SelectItem>
                <SelectItem value="acuicultura">Acuicultura</SelectItem>
                <SelectItem value="forestal">Forestal</SelectItem>
                <SelectItem value="emergencias">Emergencias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Objetivo de Monitoreo</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {visibleNeeds.map(option => (
                <button
                  key={option.id}
                  onClick={() => setNeed(option.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    need === option.id
                      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Smart Recommendation Banner */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800 shadow-sm">
                <Sparkles size={20} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Recomendación para: {recommendation.label}</h2>
                  <Badge className="bg-emerald-800 text-[10px] text-white">Recomendado</Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-700">{recommendation.explanation}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommendation.recommendations.map(id => (
                    <span key={id} className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-emerald-900 border border-emerald-200">
                      {satelliteCatalog[id].nombre} · {satelliteGuidance[id].type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={applyRecommendation} className="shrink-0 rounded-xl bg-emerald-800 text-xs font-semibold text-white hover:bg-emerald-900">
              Aplicar recomendación
            </Button>
          </div>
        </section>

        {/* Satellites Grid */}
        <section>
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Misiones Disponibles</p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Catálogo de Satélites</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">{selected.length} seleccionada(s)</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {(Object.keys(satelliteCatalog) as SatelliteId[]).map(id => {
              const definition = satelliteCatalog[id];
              const detail = satelliteGuidance[id];
              const Icon = icons[id];
              const isActive = activeForMvp.includes(id);
              const checked = selected.includes(id);

              return (
                <article
                  key={id}
                  className={`rounded-2xl border bg-white p-5 transition-all shadow-sm ${
                    checked ? "border-emerald-500 ring-1 ring-emerald-500/20" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        id === "sentinel-2" ? "bg-emerald-50 text-emerald-800" : id === "sentinel-1" ? "bg-sky-50 text-sky-800" : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={isActive ? "bg-emerald-100 text-[10px] text-emerald-900 hover:bg-emerald-100" : "bg-slate-100 text-[10px] text-slate-500 hover:bg-slate-100"}>
                        {isActive ? "Disponible MVP" : "Fase 2"}
                      </Badge>
                      <Checkbox checked={checked} onCheckedChange={() => toggle(id)} disabled={!isActive} aria-label={`Activar ${definition.nombre}`} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{definition.nombre}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {detail.type}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{detail.whyChoose}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <p className="text-slate-400 font-medium">Resolución</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{detail.resolution}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                        <p className="text-slate-400 font-medium">Revisita</p>
                        <p className="mt-0.5 font-semibold text-slate-800">{detail.revisit}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-bold text-slate-700">Variables Disponibles</p>
                      <div className="mt-2 space-y-1.5">
                        {definition.variables.slice(0, 4).map(variable => (
                          <div key={variable.variable} className="flex items-center gap-2 text-xs text-slate-600">
                            <Check size={14} className="text-emerald-700 shrink-0" />
                            <span>{variable.descripcion}</span>
                            <span className="text-slate-400 font-mono">({variable.variable})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Guidance and Architecture Notes */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Info size={18} className="text-teal-700" />
              <h2 className="font-bold text-slate-900 text-base">Criterios de Elección de Misiones</h2>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <p><strong className="text-slate-800">Óptico (Sentinel-2):</strong> Excelente resolución de 10m para vigor vegetativo y clorofila. Sensible a cobertura nubosa.</p>
              <p><strong className="text-slate-800">Radar (Sentinel-1):</strong> Atraviesa capas de nubes de día y de noche. Ideal para humedad de suelo y mapas de inundación.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Leaf size={18} className="text-teal-800" />
              <h2 className="font-bold text-slate-900 text-base">Ecosistema Copernicus CDSE</h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              AgroPulso interactúa con los servicios STAC Catalog y Statistical API del Copernicus Data Space Ecosystem, garantizando datos limpios con máscaras de nubes SCL oficiales.
            </p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
