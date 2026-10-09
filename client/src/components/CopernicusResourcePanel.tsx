import { Badge } from "@/components/ui/badge";
import { ExternalLink, Layers3, LockKeyhole, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import type { CopernicusResource, Sector } from "@shared/copernicus-catalog";

type Props = { sector: Sector; resources: CopernicusResource[] };

export default function CopernicusResourcePanel({ sector, resources }: Props) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogSearch = trpc.cleanleaf.catalogSearch.useMutation();
  const searchScenes = () => {
    setCatalogOpen(true);
    catalogSearch.mutate({
      bbox: [-72.6, -38.7, -72.5, -38.6],
      datetime: "2026-01-01T00:00:00Z/2026-12-31T23:59:59Z",
      collections: ["sentinel-2-l2a"],
      limit: 5,
      filter: "eo:cloud_cover < 60",
      filterLang: "cql2-text",
      fields: { include: ["id", "properties.datetime", "properties.eo:cloud_cover", "collection"] },
    });
  };
  return (
    <section className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Layers3 size={17} /></span>
        <div>
          <p className="text-sm font-semibold text-slate-800">Recursos Copernicus para {sector}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">Elige una fuente según la necesidad; las integraciones futuras quedan visibles, pero no se activan por accidente.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-100 bg-white/80 p-3">
        <div>
          <p className="text-xs font-semibold text-slate-800">Explorar escenas disponibles</p>
          <p className="text-[11px] text-slate-500">Catalog API · Sentinel-2 · nubosidad menor a 60% · zona demo Araucanía</p>
        </div>
        <button type="button" onClick={searchScenes} disabled={catalogSearch.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-sky-800 disabled:opacity-60">
          {catalogSearch.isPending ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          {catalogSearch.isPending ? "Buscando…" : "Buscar escenas"}
        </button>
      </div>
      {catalogOpen && catalogSearch.data ? (
        <div className="rounded-xl border border-sky-100 bg-white p-3">
          <div className="mb-2 flex items-center justify-between"><p className="text-xs font-semibold text-slate-800">Escenas encontradas</p><span className="text-[10px] text-slate-500">{catalogSearch.data.features?.length ?? 0} resultados</span></div>
          {catalogSearch.data.features?.length ? <div className="space-y-1.5">{catalogSearch.data.features.map((feature, index) => <div key={`${String(feature.id ?? "scene")}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px]"><span className="truncate font-medium text-slate-700">{String(feature.id ?? "Escena sin ID")}</span><span className="shrink-0 text-slate-400">{String((feature.properties as Record<string, unknown> | undefined)?.datetime ?? "Fecha no disponible")}</span></div>)}</div> : <p className="text-[11px] text-slate-500">No hay escenas en esta ventana con el filtro seleccionado.</p>}
          {catalogSearch.data.context?.next !== undefined ? <p className="mt-2 text-[10px] text-sky-700">Hay más resultados disponibles; la siguiente página usa el token {catalogSearch.data.context.next}.</p> : null}
        </div>
      ) : null}
      {catalogSearch.error ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">{catalogSearch.error.message}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {resources.map(resource => (
          <div key={resource.id} className="rounded-xl border border-white/80 bg-white/80 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-4 text-slate-800">{resource.nombre}</p>
              {resource.enabled ? <Badge className="bg-emerald-100 text-[10px] text-emerald-700 hover:bg-emerald-100">MVP</Badge> : <LockKeyhole size={13} className="mt-0.5 shrink-0 text-slate-400" />}
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">{resource.necesidades.slice(0, 3).join(" · ")}</p>
            <a href={resource.endpointOficial} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 hover:text-sky-900">Ver fuente oficial <ExternalLink size={11} /></a>
          </div>
        ))}
      </div>
    </section>
  );
}
