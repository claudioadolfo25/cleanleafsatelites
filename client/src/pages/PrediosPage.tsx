import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Check, FileJson, Layers, Leaf, Loader2, MapPin, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRESET_POLYGONS = [
  {
    nombre: "Fundo Las Quinas (Freire, Araucanía)",
    comuna: "Freire",
    cultivo: "Trigo / Pradera",
    geometria: {
      type: "Polygon" as const,
      coordinates: [[
        [-72.6100, -38.7100],
        [-72.5900, -38.7100],
        [-72.5900, -38.6900],
        [-72.6100, -38.6900],
        [-72.6100, -38.7100],
      ]],
    },
  },
  {
    nombre: "Fundo El Aromo (Pitrufquén, Araucanía)",
    comuna: "Pitrufquén",
    cultivo: "Raps / Avena",
    geometria: {
      type: "Polygon" as const,
      coordinates: [[
        [-72.6500, -38.8800],
        [-72.6300, -38.8800],
        [-72.6300, -38.8600],
        [-72.6500, -38.8600],
        [-72.6500, -38.8800],
      ]],
    },
  },
  {
    nombre: "Agrícola Valle Central (Curicó, Maule)",
    comuna: "Curicó",
    cultivo: "Manzanos / Cerezos",
    geometria: {
      type: "Polygon" as const,
      coordinates: [[
        [-71.2400, -34.9800],
        [-71.2200, -34.9800],
        [-71.2200, -34.9600],
        [-71.2400, -34.9600],
        [-71.2400, -34.9800],
      ]],
    },
  },
];

export default function PrediosPage() {
  const utils = trpc.useUtils();
  const { data: predios = [], isLoading } = trpc.predios.list.useQuery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [comuna, setComuna] = useState("");
  const [cultivo, setCultivo] = useState("");
  const [selectedGeoJSON, setSelectedGeoJSON] = useState<any | null>(PRESET_POLYGONS[0]?.geometria);
  const [presetIndex, setPresetIndex] = useState<number>(0);

  const createPredio = trpc.predios.create.useMutation({
    onSuccess: (newPredio) => {
      toast.success("Predio creado con éxito", { description: `${newPredio.nombre} (${newPredio.superficie_ha} ha) fue registrado.` });
      utils.predios.list.invalidate();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Error al crear el predio", { description: error.message });
    },
  });

  const deletePredio = trpc.predios.delete.useMutation({
    onSuccess: () => {
      toast.success("Predio eliminado");
      utils.predios.list.invalidate();
    },
    onError: (error) => {
      toast.error("No se pudo eliminar el predio", { description: error.message });
    },
  });

  const resetForm = () => {
    setNombre("");
    setComuna("");
    setCultivo("");
    setSelectedGeoJSON(PRESET_POLYGONS[0]?.geometria);
    setPresetIndex(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        let geometry = json;
        if (json.type === "FeatureCollection" && json.features?.[0]?.geometry) {
          geometry = json.features[0].geometry;
        } else if (json.type === "Feature" && json.geometry) {
          geometry = json.geometry;
        }

        if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
          toast.error("Formato no compatible", { description: "El archivo debe contener un Polygon o MultiPolygon GeoJSON." });
          return;
        }

        setSelectedGeoJSON(geometry);
        setPresetIndex(-1);
        toast.success("Archivo GeoJSON cargado correctamente", { description: `Geometría ${geometry.type} reconocida.` });
      } catch {
        toast.error("Error al leer GeoJSON", { description: "Asegúrate de subir un archivo JSON válido." });
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !selectedGeoJSON) {
      toast.error("Completa el formulario", { description: "Ingresa el nombre del predio y carga una geometría GeoJSON válida." });
      return;
    }

    createPredio.mutate({
      nombre: nombre.trim(),
      comuna: comuna.trim() || undefined,
      cultivo_o_uso: cultivo.trim() || undefined,
      geometria: selectedGeoJSON,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">Mis Predios</h1>
            <p className="mt-1 text-sm text-stone-500">
              Administra las parcelas y delinea sus bordes WGS84 para derivar automáticamente superficies y BBOXes de consulta.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-700 font-semibold text-white shadow-md hover:bg-emerald-800">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Predio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Predio</DialogTitle>
                <DialogDescription>
                  Ingresa los datos del predio y dibuja o sube su geometría GeoJSON. La superficie en hectáreas se calculará automáticamente en el servidor.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Predio</Label>
                  <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Fundo San Pedro" required />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="comuna">Comuna</Label>
                    <Input id="comuna" value={comuna} onChange={e => setComuna(e.target.value)} placeholder="Ej. Freire" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cultivo">Cultivo o Uso</Label>
                    <Input id="cultivo" value={cultivo} onChange={e => setCultivo(e.target.value)} placeholder="Ej. Trigo" />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-stone-500">Cargar Geometría del Polígono</Label>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <p className="text-xs font-semibold text-stone-700">Opción A: Subir GeoJSON</p>
                      <p className="mt-1 text-[11px] text-stone-500">Archivos .geojson / .json WGS84</p>
                      <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100">
                        <Upload className="mr-1.5 h-3.5 w-3.5 text-stone-500" />
                        Subir archivo
                        <input type="file" accept=".geojson,.json" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>

                    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <p className="text-xs font-semibold text-stone-700">Opción B: Plantillas de Zona</p>
                      <p className="mt-1 text-[11px] text-stone-500">Seleccionar coordenadas predefinidas</p>
                      <select
                        value={presetIndex}
                        onChange={e => {
                          const idx = Number(e.target.value);
                          setPresetIndex(idx);
                          if (idx >= 0 && PRESET_POLYGONS[idx]) {
                            setSelectedGeoJSON(PRESET_POLYGONS[idx]!.geometria);
                            if (!nombre) setNombre(PRESET_POLYGONS[idx]!.nombre);
                            if (!comuna) setComuna(PRESET_POLYGONS[idx]!.comuna);
                            if (!cultivo) setCultivo(PRESET_POLYGONS[idx]!.cultivo);
                          }
                        }}
                        className="mt-3 h-8 w-full rounded-lg border border-stone-300 bg-white px-2 text-xs font-medium text-stone-800"
                      >
                        {PRESET_POLYGONS.map((p, idx) => (
                          <option key={p.nombre} value={idx}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {selectedGeoJSON ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>Geometría {selectedGeoJSON.type} cargada ({selectedGeoJSON.coordinates?.[0]?.length ?? 0} vértices)</span>
                  </div>
                ) : null}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createPredio.isPending} className="bg-emerald-700 hover:bg-emerald-800">
                    {createPredio.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar Predio
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-stone-100" />)}
          </div>
        ) : predios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
            <MapPin className="mx-auto h-10 w-10 text-stone-300" />
            <h3 className="mt-3 text-sm font-semibold text-stone-800">Sin predios registrados</h3>
            <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
              Registra tus parcelas con coordenadas GeoJSON WGS84 para realizar monitoreos satelitales en zonas exactas.
            </p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4 bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar primer predio
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {predios.map(predio => (
              <div key={predio.id} className="relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <MapPin size={16} />
                      </span>
                      <h3 className="font-bold text-stone-800 truncate">{predio.nombre}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePredio.mutate({ id: predio.id })}
                      disabled={deletePredio.isPending}
                      className="h-8 w-8 text-stone-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-stone-100 pb-2">
                      <span className="text-stone-400">Superficie</span>
                      <span className="font-bold text-emerald-800">{predio.superficie_ha} ha</span>
                    </div>
                    {predio.comuna ? (
                      <div className="flex justify-between border-b border-stone-100 pb-2">
                        <span className="text-stone-400">Comuna</span>
                        <span className="font-semibold text-stone-700">{predio.comuna}</span>
                      </div>
                    ) : null}
                    {predio.cultivo_o_uso ? (
                      <div className="flex justify-between pb-1">
                        <span className="text-stone-400">Uso / Cultivo</span>
                        <span className="font-semibold text-stone-700">{predio.cultivo_o_uso}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-stone-50 px-2.5 py-1.5 text-[11px] text-stone-500">
                  <Layers size={13} className="text-stone-400 shrink-0" />
                  <span className="truncate">Geometría WGS84 ({predio.geometria?.type})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
