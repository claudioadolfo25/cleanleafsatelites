import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import type { SatelliteDefinition, SatelliteId } from "@shared/satellite-catalog";
import { AlertTriangle, Calendar, CheckCircle2, Leaf, Loader2, MapPinned, ScanSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SatelliteSelector from "./SatelliteSelector";
import CopernicusResourcePanel from "./CopernicusResourcePanel";

type SolicitudAnalisisFormProps = {
  onSuccess: () => void;
};

const tierFromHectares = (hectares: number) => {
  if (hectares <= 50) return { label: "Predio", detail: "0,5–50 ha · análisis detallado" };
  if (hectares <= 5000) return { label: "Zona extendida", detail: "50,01–5.000 ha · visión territorial" };
  return { label: "Regional · requiere evaluación", detail: ">5.000 ha · requiere autorización" };
};

export default function SolicitudAnalisisForm({ onSuccess }: SolicitudAnalisisFormProps) {
  const { data: userPredios = [], isLoading: prediosLoading } = trpc.predios.list.useQuery();
  const [selectedPredioId, setSelectedPredioId] = useState<string>("");
  const [satellites, setSatellites] = useState<SatelliteId[]>(["sentinel-2"]);
  const [selectedVariables, setSelectedVariables] = useState<Record<string, string>>({ "sentinel-2": "ndvi" });

  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const [periodFrom, setPeriodFrom] = useState(fifteenDaysAgo);
  const [periodTo, setPeriodTo] = useState(today);

  const { data: catalog = [], isLoading: catalogLoading } = trpc.cleanleaf.catalog.useQuery({ vertical: "agricultura" });
  const { data: configStatus } = trpc.cleanleaf.configStatus.useQuery({ vertical: "agricultura" });
  const { data: copernicusResources = [] } = trpc.cleanleaf.resources.useQuery({ sector: "agricultura" });
  const catalogDefinitions = useMemo(() => catalog as SatelliteDefinition[], [catalog]);
  const catalogById = useMemo(
    () => new Map(catalogDefinitions.map(definition => [definition.id, definition])),
    [catalogDefinitions]
  );
  const selectedVariablesForRequest = useMemo(
    () => satellites.map(satellite => selectedVariables[satellite] ?? catalogById.get(satellite)?.variables[0]?.variable ?? "ndvi"),
    [catalogById, satellites, selectedVariables]
  );

  const createAnalysis = trpc.cleanleaf.createAnalysis.useMutation({
    onSuccess: result => {
      toast.success("Análisis creado", { description: (result as { mensaje?: string }).mensaje ?? "La solicitud fue validada." });
      onSuccess();
    },
    onError: error => toast.error("No pudimos crear la solicitud", { description: error.message }),
  });

  useEffect(() => {
    if (userPredios.length > 0 && !selectedPredioId) {
      setSelectedPredioId(userPredios[0]!.id);
    }
  }, [userPredios, selectedPredioId]);

  useEffect(() => {
    if (catalog.length > 0) {
      const available = catalog.map(item => item.id);
      setSatellites(current => current.filter(item => available.includes(item)) as SatelliteId[]);
    }
  }, [catalog]);

  const activePredio = useMemo(() => {
    return userPredios.find(p => p.id === selectedPredioId) ?? null;
  }, [userPredios, selectedPredioId]);

  const numericHectares = activePredio?.superficie_ha ?? 42;
  const tier = useMemo(() => tierFromHectares(numericHectares), [numericHectares]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (userPredios.length === 0) {
      toast.error("Sin predios registrados", { description: "Debes registrar al menos un predio para solicitar un análisis satelital." });
      return;
    }

    if (!selectedPredioId) {
      toast.error("Selecciona un predio", { description: "Debes seleccionar un predio registrado para consultar." });
      return;
    }

    const fromDate = new Date(`${periodFrom}T00:00:00Z`).getTime();
    const toDate = new Date(`${periodTo}T23:59:59Z`).getTime();

    if (isNaN(fromDate) || isNaN(toDate)) {
      toast.error("Fechas inválidas", { description: "Ingresa fechas de inicio y término válidas." });
      return;
    }

    if (toDate - fromDate < 24 * 60 * 60 * 1000) {
      toast.error("Rango de fechas insuficiente", { description: "El periodo de análisis debe ser de al menos 24 horas." });
      return;
    }

    if (!activePredio) {
      toast.error("Predio no encontrado", { description: "El predio seleccionado no es válido." });
      return;
    }

    createAnalysis.mutate({
      predioId: activePredio.id,
      predioNombre: activePredio.nombre,
      vertical: "agricultura",
      satellites,
      variables: selectedVariablesForRequest,
      periodFrom: new Date(`${periodFrom}T00:00:00Z`).toISOString(),
      periodTo: new Date(`${periodTo}T23:59:59Z`).toISOString(),
    });
  };

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="predio" className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Seleccionar Predio</Label>
          <span className="text-xs font-medium text-emerald-700">{userPredios.length} predios disponibles</span>
        </div>
        {prediosLoading ? (
          <div className="h-11 animate-pulse rounded-xl bg-stone-100" />
        ) : userPredios.length > 0 ? (
          <Select value={selectedPredioId} onValueChange={setSelectedPredioId}>
            <SelectTrigger className="h-11 border-stone-200 bg-stone-50 text-sm font-medium text-stone-800">
              <div className="flex items-center gap-2 truncate">
                <MapPinned className="h-4 w-4 text-emerald-700 shrink-0" />
                <SelectValue placeholder="Selecciona un predio registrado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {userPredios.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre} ({p.superficie_ha} ha{p.comuna ? ` · ${p.comuna}` : ""})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">No tienes predios registrados con polígono.</p>
              <p className="mt-1 text-stone-600">Para procesar un análisis satelital real, debes registrar tu predio primero.</p>
            </div>
            <a href="/dashboard/predios" className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800 transition">
              Crear predio
            </a>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="periodFrom" className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Fecha Inicio</Label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input id="periodFrom" type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className="h-11 border-stone-200 bg-stone-50 pl-9 text-xs text-stone-800 focus-visible:border-emerald-500" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodTo" className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Fecha Término</Label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input id="periodTo" type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="h-11 border-stone-200 bg-stone-50 pl-9 text-xs text-stone-800 focus-visible:border-emerald-500" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
        <div className="flex gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm"><Leaf size={16} /></span>
          <div>
            <p className="text-sm font-semibold text-stone-800">Superficie calculada: {numericHectares} ha ({tier.label})</p>
            <p className="mt-0.5 text-xs text-stone-500">{tier.detail}. Calculada geométricamente en servidor a partir del polígono WGS84.</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Fuentes de datos</Label>
          <span className="text-[11px] font-medium text-stone-400">Agricultura · BBOX Derivado</span>
        </div>
        {catalogLoading ? <div className="h-32 animate-pulse rounded-xl bg-stone-100" /> : <SatelliteSelector satellites={catalog as SatelliteDefinition[]} selected={satellites} onChange={setSatellites} vertical="agricultura" />}
      </div>

      {satellites.length > 0 ? (
        <div className="space-y-2.5">
          <Label className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Variables a consultar</Label>
          {satellites.map(satelliteId => {
            const definition = (catalog as SatelliteDefinition[]).find(item => item.id === satelliteId);
            if (!definition) return null;
            const value = selectedVariables[satelliteId] ?? definition.variables[0]?.variable;
            return (
              <div key={satelliteId} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-stone-700">{definition.nombre}</p><p className="text-[11px] text-stone-400">{definition.variables.find(item => item.variable === value)?.descripcion}</p></div>
                <Select value={value} onValueChange={next => setSelectedVariables(current => ({ ...current, [satelliteId]: next }))}>
                  <SelectTrigger className="h-9 w-[145px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{definition.variables.map(variable => <SelectItem key={variable.variable} value={variable.variable}>{variable.variable} · {variable.unidad}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      ) : null}

      <CopernicusResourcePanel sector="agricultura" resources={copernicusResources} />

      {configStatus && !configStatus.valid ? (
        <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span><strong className="font-semibold">Configuración ajustada de forma segura.</strong> {configStatus.warnings.join(" ")}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
        <ScanSearch size={15} className="shrink-0" />
        <span>Sentinel-1 se usará como respaldo cuando la nubosidad impida una lectura óptica confiable.</span>
      </div>

      <Button type="submit" disabled={createAnalysis.isPending || catalogLoading || userPredios.length === 0} className="h-11 w-full rounded-xl bg-emerald-700 text-sm font-semibold shadow-[0_10px_25px_-12px_rgba(4,120,87,0.75)] transition hover:bg-emerald-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
        {createAnalysis.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando solicitud…</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Solicitar análisis</>}
      </Button>
    </form>
  );
}
