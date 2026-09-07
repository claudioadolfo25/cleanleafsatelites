import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import type { SatelliteDefinition, SatelliteId } from "@shared/satellite-catalog";
import { CheckCircle2, Leaf, Loader2, MapPinned, ScanSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import SatelliteSelector from "./SatelliteSelector";

type SolicitudAnalisisFormProps = {
  onSuccess: () => void;
};

const tierFromHectares = (hectares: number) => {
  if (hectares <= 100) return { label: "Predio", detail: "0,5–100 ha · análisis detallado" };
  if (hectares <= 10_000) return { label: "Zona extendida", detail: "101–10.000 ha · visión territorial" };
  return { label: "Regional", detail: ">10.000 ha · contexto regional" };
};

export default function SolicitudAnalisisForm({ onSuccess }: SolicitudAnalisisFormProps) {
  const [predio, setPredio] = useState("Las Quinas");
  const [hectareas, setHectareas] = useState("42");
  const [satellites, setSatellites] = useState<SatelliteId[]>(["sentinel-2"]);
  const { data: catalog = [], isLoading: catalogLoading } = trpc.cleanleaf.catalog.useQuery({ vertical: "agricultura" });
  const createAnalysis = trpc.cleanleaf.createAnalysis.useMutation({
    onSuccess: result => {
      toast.success("Análisis programado", { description: result.mensaje });
      onSuccess();
    },
    onError: error => toast.error("No pudimos crear la solicitud", { description: error.message }),
  });

  useEffect(() => {
    if (catalog.length > 0) {
      const available = catalog.map(item => item.id);
      setSatellites(current => current.filter(item => available.includes(item)) as SatelliteId[]);
    }
  }, [catalog]);

  const numericHectares = Number(hectareas) || 0;
  const tier = useMemo(() => tierFromHectares(numericHectares), [numericHectares]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!predio.trim() || numericHectares <= 0 || satellites.length === 0) {
      toast.error("Completa los datos del análisis", { description: "Selecciona un predio, superficie y al menos una fuente." });
      return;
    }

    createAnalysis.mutate({
      predioId: `predio-${predio.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      predioNombre: predio.trim(),
      hectareas: numericHectares,
      vertical: "agricultura",
      satellites,
    });
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-[1fr_130px]">
        <div className="space-y-2">
          <Label htmlFor="predio" className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Predio</Label>
          <div className="relative">
            <MapPinned className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input id="predio" value={predio} onChange={event => setPredio(event.target.value)} className="h-11 border-stone-200 bg-stone-50 pl-9 text-stone-800 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hectareas" className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Superficie</Label>
          <div className="relative">
            <Input id="hectareas" inputMode="numeric" value={hectareas} onChange={event => setHectareas(event.target.value)} className="h-11 border-stone-200 bg-stone-50 pr-9 text-stone-800 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20" />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-400">ha</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
        <div className="flex gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm"><Leaf size={16} /></span>
          <div>
            <p className="text-sm font-semibold text-stone-800">Nivel asignado: {tier.label}</p>
            <p className="mt-0.5 text-xs text-stone-500">{tier.detail}. El tamaño y la fuente de datos se resuelven de forma independiente.</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Fuentes de datos</Label>
          <span className="text-[11px] font-medium text-stone-400">Agricultura · Araucanía</span>
        </div>
        {catalogLoading ? <div className="h-32 animate-pulse rounded-xl bg-stone-100" /> : <SatelliteSelector satellites={catalog as SatelliteDefinition[]} selected={satellites} onChange={setSatellites} vertical="agricultura" />}
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
        <ScanSearch size={15} className="shrink-0" />
        <span>Sentinel-1 se usará como respaldo cuando la nubosidad impida una lectura óptica confiable.</span>
      </div>

      <Button type="submit" disabled={createAnalysis.isPending || catalogLoading} className="h-11 w-full rounded-xl bg-emerald-700 text-sm font-semibold shadow-[0_10px_25px_-12px_rgba(4,120,87,0.75)] transition hover:bg-emerald-800 active:scale-[0.98]">
        {createAnalysis.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando solicitud…</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Solicitar análisis</>}
      </Button>
    </form>
  );
}
