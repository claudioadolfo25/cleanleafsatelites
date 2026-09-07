import { Badge } from "@/components/ui/badge";
import { ExternalLink, Layers3, LockKeyhole } from "lucide-react";
import type { CopernicusResource, Sector } from "@shared/copernicus-catalog";

type Props = { sector: Sector; resources: CopernicusResource[] };

export default function CopernicusResourcePanel({ sector, resources }: Props) {
  return (
    <section className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Layers3 size={17} /></span>
        <div>
          <p className="text-sm font-semibold text-slate-800">Recursos Copernicus para {sector}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">Elige una fuente según la necesidad; las integraciones futuras quedan visibles, pero no se activan por accidente.</p>
        </div>
      </div>
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
