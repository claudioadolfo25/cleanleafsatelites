import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Building2, Trees, Droplet } from "lucide-react";
import { toast } from "sonner";

interface Predio {
  id: string;
  nombre: string;
  sector: "agricultura" | "acuicultura" | "forestal";
  superficieHa: number;
  ubicacion: string;
  sateliteAsignado: string;
  tier: string;
}

const INITIAL_PREDIOS: Predio[] = [
  {
    id: "p1",
    nombre: "Fundo Los Avellanos",
    sector: "agricultura",
    superficieHa: 45,
    ubicacion: "La Araucanía, Chile",
    sateliteAsignado: "Sentinel-2 L2A",
    tier: "Tier 1 (<50 ha)",
  },
  {
    id: "p2",
    nombre: "Agrícola El Vergel",
    sector: "agricultura",
    superficieHa: 180,
    ubicacion: "La Araucanía, Chile",
    sateliteAsignado: "Sentinel-2 + Sentinel-1 CSAR",
    tier: "Tier 2 (50-500 ha)",
  },
  {
    id: "p3",
    nombre: "Centro Acuícola Reloncaví",
    sector: "acuicultura",
    superficieHa: 120,
    ubicacion: "Los Lagos, Chile",
    sateliteAsignado: "Sentinel-3 OLCI + SLSTR",
    tier: "Tier 2 (50-500 ha)",
  },
];

export default function PrediosPage() {
  const [predios, setPredios] = useState<Predio[]>(INITIAL_PREDIOS);
  const [isCreating, setIsCreating] = useState(false);
  const [nombre, setNombre] = useState("");
  const [sector, setSector] = useState<"agricultura" | "acuicultura" | "forestal">("agricultura");
  const [superficie, setSuperficie] = useState("");
  const [ubicacion, setUbicacion] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !superficie || !ubicacion) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }

    const ha = parseFloat(superficie);
    let tier = "Tier 1 (<50 ha)";
    if (ha >= 50 && ha <= 500) tier = "Tier 2 (50-500 ha)";
    if (ha > 500) tier = "Tier 3 (>500 ha)";

    let satelite = "Sentinel-2 L2A";
    if (sector === "acuicultura") satelite = "Sentinel-3 OLCI + Sentinel-2";
    else if (sector === "forestal") satelite = "Sentinel-2 + Sentinel-1 CSAR";
    else if (ha >= 50) satelite = "Sentinel-2 + Sentinel-1 CSAR";

    const newPredio: Predio = {
      id: `p${Date.now()}`,
      nombre,
      sector,
      superficieHa: ha,
      ubicacion,
      sateliteAsignado: satelite,
      tier,
    };

    setPredios([newPredio, ...predios]);
    toast.success("Predio registrado exitosamente");
    setNombre("");
    setSuperficie("");
    setUbicacion("");
    setIsCreating(false);
  };

  const getSectorIcon = (sec: string) => {
    switch (sec) {
      case "acuicultura":
        return <Droplet className="w-4 h-4 text-cyan-600" />;
      case "forestal":
        return <Trees className="w-4 h-4 text-emerald-600" />;
      default:
        return <Building2 className="w-4 h-4 text-green-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestión de Predios y Sitios</h1>
          <p className="text-sm text-slate-500">
            Administra los terrenos de monitoreo satelital y consulta su clasificación automática de Tiers y constelaciones.
          </p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="bg-green-700 hover:bg-green-800 text-white">
          <Plus className="w-4 h-4 mr-2" />
          {isCreating ? "Cancelar" : "Nuevo Predio"}
        </Button>
      </div>

      {isCreating && (
        <Card className="border-green-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Registrar Nuevo Predio / Sitio</CardTitle>
            <CardDescription>
              El motor de enrutamiento satelital asignará los satélites óptimos automáticamente según superficie y sector.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Predio / Campo</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Fundo Don Alberto"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sector">Sector Productivo</Label>
                  <Select value={sector} onValueChange={(val: any) => setSector(val)}>
                    <SelectTrigger id="sector">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agricultura">Agricultura (Cultivos / Frutales)</SelectItem>
                      <SelectItem value="acuicultura">Acuicultura (Centros de Cultivo / Lagos)</SelectItem>
                      <SelectItem value="forestal">Forestal (Plantaciones / Bosque Natural)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="superficie">Superficie Total (Hectáreas)</Label>
                  <Input
                    id="superficie"
                    type="number"
                    placeholder="Ej: 120"
                    value={superficie}
                    onChange={(e) => setSuperficie(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ubicacion">Comuna / Región</Label>
                  <Input
                    id="ubicacion"
                    placeholder="Ej: Temuco, La Araucanía"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-green-700 hover:bg-green-800 text-white">
                  Guardar Predio
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Predios Registrados ({predios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Superficie</TableHead>
                <TableHead>Clasificación Tier</TableHead>
                <TableHead>Satélites Asignados</TableHead>
                <TableHead>Ubicación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predios.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-slate-900">{p.nombre}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 capitalize text-xs font-medium">
                      {getSectorIcon(p.sector)}
                      <span>{p.sector}</span>
                    </div>
                  </TableCell>
                  <TableCell>{p.superficieHa} ha</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-normal">
                      {p.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-green-200 text-green-800 bg-green-50/50">
                      {p.sateliteAsignado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {p.ubicacion}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
