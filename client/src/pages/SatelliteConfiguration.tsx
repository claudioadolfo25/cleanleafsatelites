import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { satelliteCatalog, type SatelliteId, type Vertical } from "@shared/satellite-catalog";
import { guidanceForNeed, needOptions, satelliteGuidance, type NeedId } from "@shared/satellite-guidance";
import { ArrowLeft, Check, ChevronRight, CloudSun, Info, Leaf, Radio, Save, Sparkles, ThermometerSun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
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
    <div className="min-h-screen bg-[#f7f7f2] text-stone-800">
      <header className="sticky top-0 z-20 border-b border-[#e6e7dd]/90 bg-[#f7f7f2]/95 px-4 py-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-emerald-800"><ArrowLeft size={16} /> Volver al resumen</Link><span className="text-xs font-medium text-stone-400">Configuración de fuentes</span></div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
        <div className="max-w-3xl"><div className="mb-3 flex items-center gap-2 text-emerald-700"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100"><Sparkles size={15} /></span><span className="text-xs font-bold uppercase tracking-[0.14em]">Monitoreo inteligente</span></div><h1 className="font-serif text-4xl leading-tight tracking-[-0.04em] text-stone-800 sm:text-5xl">Configura tus fuentes satelitales con claridad.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-stone-500">No necesitas saber de teledetección. Cuéntanos qué quieres entender y te mostraremos qué fuente conviene, qué puede medir y cuándo cambiar a otra.</p></div>
        <div className="mt-8 grid gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-[180px_1fr] sm:p-5"><div><label className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">Tu sector</label><Select value={vertical} onValueChange={value => setVertical(value as ConfigSector)}><SelectTrigger className="mt-2 h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="agricultura">Agricultura</SelectItem><SelectItem value="acuicultura">Acuicultura</SelectItem><SelectItem value="forestal">Forestal</SelectItem><SelectItem value="emergencias">Emergencias</SelectItem></SelectContent></Select></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-stone-400">¿Qué necesitas resolver?</p><div className="mt-2 flex flex-wrap gap-2">{visibleNeeds.map(option => <button key={option.id} onClick={() => setNeed(option.id)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${need === option.id ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-stone-200 bg-stone-50 text-stone-500 hover:border-emerald-300"}`}>{option.label}</button>)}</div></div></div>
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-[#eef7e9] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><Sparkles size={18} /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold text-stone-800">Recomendación para: {recommendation.label}</h2><Badge className="bg-emerald-700 text-[10px] text-white hover:bg-emerald-700">Por necesidad</Badge></div><p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">{recommendation.explanation}</p><div className="mt-3 flex flex-wrap gap-2">{recommendation.recommendations.map(id => <span key={id} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-800">{satelliteCatalog[id].nombre} · {satelliteGuidance[id].type}</span>)}</div></div></div><Button onClick={applyRecommendation} className="shrink-0 rounded-xl bg-emerald-700 text-xs font-semibold hover:bg-emerald-800">Aplicar recomendación</Button></div></section>
        <section className="mt-8"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-400">Fuentes disponibles</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-800">Elige una principal y un complemento</h2></div><span className="hidden text-xs text-stone-400 sm:block">{selected.length} seleccionada{selected.length === 1 ? "" : "s"}</span></div><div className="mt-4 grid gap-4 lg:grid-cols-3">{(Object.keys(satelliteCatalog) as SatelliteId[]).map(id => { const definition = satelliteCatalog[id]; const detail = satelliteGuidance[id]; const Icon = icons[id]; const isActive = activeForMvp.includes(id); const checked = selected.includes(id); return <article key={id} className={`rounded-2xl border bg-white p-5 transition ${checked ? "border-emerald-400 shadow-[0_16px_35px_-25px_rgba(4,120,87,.55)]" : "border-stone-200"}`}><div className="flex items-start justify-between gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${id === "sentinel-2" ? "bg-emerald-50 text-emerald-700" : id === "sentinel-1" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}><Icon size={19} /></div><div className="flex items-center gap-2"><Badge className={isActive ? "bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100" : "bg-stone-100 text-[10px] text-stone-500 hover:bg-stone-100"}>{isActive ? "Disponible MVP" : "Fase 2"}</Badge><Checkbox checked={checked} onCheckedChange={() => toggle(id)} disabled={!isActive} aria-label={`Activar ${definition.nombre}`} /></div></div><div className="mt-4"><div className="flex items-center gap-2"><h3 className="text-lg font-bold text-stone-800">{definition.nombre}</h3><span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-stone-500">{detail.type}</span></div><p className="mt-2 text-sm leading-5 text-stone-500">{detail.whyChoose}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-stone-50 p-2.5"><p className="text-stone-400">Detalle</p><p className="mt-1 font-semibold text-stone-700">{detail.resolution}</p></div><div className="rounded-lg bg-stone-50 p-2.5"><p className="text-stone-400">Revisión</p><p className="mt-1 font-semibold text-stone-700">{detail.revisit}</p></div></div><div className="mt-4"><p className="text-xs font-bold text-stone-600">Obtienes</p><div className="mt-2 space-y-1.5">{definition.variables.slice(0, 4).map(variable => <div key={variable.variable} className="flex items-center gap-2 text-xs text-stone-500"><Check size={13} className="text-emerald-600" />{variable.descripcion} <span className="text-stone-300">({variable.variable})</span></div>)}</div></div><div className="mt-4 border-t border-stone-100 pt-3"><p className="text-xs font-bold text-stone-600">Ten presente</p>{detail.limitations.map(item => <p key={item} className="mt-1 text-xs leading-4 text-stone-500">· {item}</p>)}</div></div></article>; })}</div></section>
        <section className="mt-8 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-stone-200 bg-white p-5"><div className="flex items-center gap-2"><Info size={17} className="text-sky-700" /><h2 className="font-bold text-stone-800">¿Por qué cambiar de satélite?</h2></div><div className="mt-4 space-y-3 text-sm leading-5 text-stone-600"><p><strong className="text-stone-800">Cielo despejado:</strong> Sentinel-2 da más detalle para ver vigor, cobertura y estrés del cultivo.</p><p><strong className="text-stone-800">Nubosidad persistente:</strong> Sentinel-1 mantiene una lectura radar aun cuando la imagen óptica no es utilizable.</p><p><strong className="text-stone-800">Riego:</strong> combinar radar y óptico ayuda a comparar humedad/estructura con la respuesta de la planta.</p><p><strong className="text-stone-800">Agua marina:</strong> Sentinel-3 es más pertinente para temperatura y color oceánico, pero no para parcelas pequeñas.</p></div></div><div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-5"><div className="flex items-center gap-2"><Leaf size={17} className="text-emerald-700" /><h2 className="font-bold text-stone-800">Copernicus no es un satélite</h2></div><p className="mt-3 text-sm leading-6 text-stone-600">Es el ecosistema europeo que reúne misiones Sentinel y servicios de tierra, océano, clima, atmósfera y emergencias. Cleanleaf usa el catálogo para elegir el recurso correcto sin activar fuentes que aún no estén listas.</p><div className="mt-4 flex flex-wrap gap-2">{["CDSE", "CMEMS", "CLMS", "CEMS", "CDS", "CAMS"].map(service => <span key={service} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-sky-800">{service}</span>)}</div></div></section>
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><Link href="/" className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-800">Cancelar <ChevronRight size={15} /></Link><Button onClick={save} className="h-11 rounded-xl bg-emerald-700 px-5 text-sm font-semibold hover:bg-emerald-800"><Save className="mr-2 h-4 w-4" />Guardar configuración</Button></div>
      </main>
    </div>
  );
}
