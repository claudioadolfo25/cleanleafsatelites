import { useState } from "react";
import { useUserProfile, VERTICAL_DETAILS, IndustryVertical, UserProfileData } from "../lib/userProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Building, Phone, Mail, Trees, Waves, Sprout, ShieldCheck, CheckCircle2, Sparkles, FileText, Satellite } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { profile, updateProfile } = useUserProfile();
  const [formData, setFormData] = useState<UserProfileData>(profile);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
    setIsSaved(true);
    toast.success("Perfil y vertical del usuario actualizados correctamente");
    setTimeout(() => setIsSaved(false), 3000);
  };

  const selectedVerticalInfo = VERTICAL_DETAILS[formData.vertical];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-8 text-white shadow-xl relative overflow-hidden border border-emerald-800/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5">
                Configuración de Perfil
              </Badge>
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs font-semibold px-2.5 py-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal-400" /> Multi-Tenant Active
              </Badge>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Perfil del Usuario & Vertical Agrícola / Industrial
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Personalice sus datos y defina la orientación productiva de sus terrenos (Forestal, Acuícola, Agrícola, etc.). AgroPulso optimizará automáticamente los satélites asignados y la generación de informes personalizados.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur min-w-[200px]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-2xl mb-2 border border-emerald-400/30">
              {formData.nombre.charAt(0)}
            </div>
            <span className="font-bold text-sm text-white text-center truncate max-w-[180px]">
              {formData.nombre}
            </span>
            <span className="text-xs text-emerald-300 capitalize flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3" /> Vertical: {formData.vertical}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-800" /> Datos Personales y de Organización
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Estos datos se incluirán en las portadas de los informes ejecutivos McKinsey y Copernicus.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre" className="text-xs font-semibold text-slate-700">Nombre Completo</Label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="organizacion" className="text-xs font-semibold text-slate-700">Empresa / Organización</Label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="organizacion"
                      value={formData.organizacion}
                      onChange={(e) => setFormData({ ...formData, organizacion: e.target.value })}
                      className="pl-9 text-sm"
                      placeholder="Ej. Forestal Arauco / Salmonera Sur"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telefono" className="text-xs font-semibold text-slate-700">Teléfono de Contacto</Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Industry Vertical & Operational Context */}
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trees className="w-5 h-5 text-emerald-800" /> Vertical Productiva y Terrenos
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Seleccione su actividad principal para afinar la resolución satelital, misiones prioritarias y modelos de IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="vertical" className="text-xs font-semibold text-slate-700">Vertical del Negocio</Label>
                <Select
                  value={formData.vertical}
                  onValueChange={(val: IndustryVertical) => setFormData({ ...formData, vertical: val })}
                >
                  <SelectTrigger id="vertical" className="w-full text-sm font-medium">
                    <SelectValue placeholder="Seleccione la vertical..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forestal" className="text-sm font-medium">
                      🌲 Forestal / Madera, Biomasa y Dosel
                    </SelectItem>
                    <SelectItem value="acuicola" className="text-sm font-medium">
                      🌊 Acuícola / Calidad de Agua, LST y Embalses
                    </SelectItem>
                    <SelectItem value="agricola" className="text-sm font-medium">
                      🌾 Agrícola Tradicional / Cereales y Granos
                    </SelectItem>
                    <SelectItem value="ganadero" className="text-sm font-medium">
                      🐄 Ganadero / Pasturas y Pastizales
                    </SelectItem>
                    <SelectItem value="fruticola" className="text-sm font-medium">
                      🍎 Frutícola / Cultivos de Alto Valor
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="superficie" className="text-xs font-semibold text-slate-700">Superficie Total (Hectáreas)</Label>
                  <Input
                    id="superficie"
                    type="number"
                    value={formData.superficieHectareas}
                    onChange={(e) => setFormData({ ...formData, superficieHectareas: Number(e.target.value) })}
                    className="text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="preferencia" className="text-xs font-semibold text-slate-700">Formato de Informe Preferido</Label>
                  <Select
                    value={formData.preferenciaInforme}
                      onValueChange={(val: 'copernicus' | 'mckinsey' | 'tecnico') => setFormData({ ...formData, preferenciaInforme: val })}
                  >
                    <SelectTrigger id="preferencia" className="text-sm font-medium">
                      <SelectValue placeholder="Seleccione formato..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mckinsey">McKinsey Executive Briefing (Estratégico)</SelectItem>
                      <SelectItem value="copernicus">Copernicus Scientific Standard (Oficial CDSE)</SelectItem>
                      <SelectItem value="tecnico">Técnico Operativo (Agrónomo de Campo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="region" className="text-xs font-semibold text-slate-700">Ubicación / Región de Predios</Label>
                <Input
                  id="region"
                  value={formData.regionUbicacion}
                  onChange={(e) => setFormData({ ...formData, regionUbicacion: e.target.value })}
                  className="text-sm"
                  placeholder="Ej. Región del Maule, Chile / Cuenca del Plata"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notas" className="text-xs font-semibold text-slate-700">Notas sobre el Terreno o Especies</Label>
                <Textarea
                  id="notas"
                  rows={3}
                  value={formData.notasTerreno}
                  onChange={(e) => setFormData({ ...formData, notasTerreno: e.target.value })}
                  className="text-sm leading-relaxed"
                  placeholder="Detalle si cuenta con especies específicas (pino, salmón, maíz) o zonas de monitoreo continuo."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md">
                  {isSaved ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" /> ¡Guardado Exitosamente!
                    </span>
                  ) : (
                    "Guardar Cambios de Perfil"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Recommendation Preview */}
        <div className="space-y-6">
          <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white shadow-sm sticky top-20">
            <CardHeader className="border-b border-emerald-100">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] font-bold">
                  Motor de Recomendación Satelital
                </Badge>
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900 mt-2">
                Personalización para {selectedVerticalInfo.label}
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Así gestionará AgroPulso la información satelital para su perfil.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Descripción Operativa
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedVerticalInfo.description}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-emerald-700" /> Satélites Prioritarios
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedVerticalInfo.satellites.map((sat, idx) => (
                    <Badge key={idx} variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-200 text-xs font-medium py-1">
                      {sat}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-700" /> Informes Recomendados
                </span>
                <ul className="space-y-1.5">
                  {selectedVerticalInfo.recommendedReports.map((rep, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{rep}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-emerald-900 text-white text-xs space-y-1">
                <span className="font-bold text-emerald-200 block">Siguiente paso sugerido:</span>
                <p className="text-slate-200">
                  Consulte al Agente IA Agrónomo para solicitar un informe McKinsey o Copernicus adaptado a sus {formData.superficieHectareas} hectáreas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
