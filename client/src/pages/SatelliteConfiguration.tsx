import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { satelliteCatalog, type SatelliteId, type Vertical } from "@shared/satellite-catalog";
import { guidanceForNeed, needOptions, satelliteGuidance, type NeedId } from "@shared/satellite-guidance";
import { Check, CloudSun, Info, Leaf, Radio, Save, Sparkles, ThermometerSun, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const icons = { "sentinel-1": Radio, "sentinel-2": CloudSun, "sentinel-3": ThermometerSun };
const activeForMvp: SatelliteId[] = ["sentinel-1", "sentinel-2"];
type ConfigSector = Vertical | "emergencias";

function activeForVertical(vertical: ConfigSector): SatelliteId[] {
  if (vertical === "acuicultura") return ["sentinel-2"];
  if (vertical === "emergencias") return [];
  return activeForMvp;
}

export default function SatelliteConfiguration() {
  const [vertical, setVertical] = useState<ConfigSector>("agricultura");
  const [need, setNeed] = useState<NeedId>("nubosidad");
  const [selected, setSelected] = useState<SatelliteId[]>(["sentinel-2", "sentinel-1"]);
  const recommendation = useMemo(() => guidanceForNeed(need), [need]);
  const visibleNeeds = needOptions.filter(option => option.verticals.includes(vertical));
  const activeSources = activeForVertical(vertical);

  useEffect(() => {
    const saved = localStorage.getItem("cleanleaf-satellite-preferences");
    if (!saved) return;
    try {
      const preferences = JSON.parse(saved) as { vertical?: ConfigSector; need?: NeedId; selected?: SatelliteId[] };
      if (preferences.vertical) setVertical(preferences.vertical);
      if (preferences.need) setNeed(preferences.need);
      if (preferences.selected?.length) setSelected(preferences.selected);
    } catch {
      localStorage.removeItem("cleanleaf-satellite-preferences");
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
    toast.success("Configuración guardada", { description: "Se usará como preferencia en tus próximos análisis." });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 rounded-2xl text-white shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-300 border-emerald-500/50 bg-emerald-950">
                Catálogo Copernicus CDSE
              </Badge>
              <span className="text-xs text-emerald-200/80 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Política por Vertical Habilitada
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Configuración de Fuentes Satelitales</h1>
            <p className="text-emerald-100/90 text-sm max-w-2xl">
              Seleccione la vertical agronómica y las misiones Sentinel activas para personalizar los reportes y procesamiento de su predio.
            </p>
          </div>

          <Button onClick={save} className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-md">
            <Save className="mr-2 h-4 w-4" /> Guardar Preferencias
          </Button>
        </div>

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
