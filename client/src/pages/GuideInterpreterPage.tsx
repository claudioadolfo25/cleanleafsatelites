import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, CloudRain, Layers, Activity, AlertTriangle, CheckCircle2, Sparkles, Compass, Sliders, User, MapPin, FileText } from "lucide-react";

export default function GuideInterpreterPage() {
  const [selectedNdvi, setSelectedNdvi] = useState<number>(0.65);

  const getNdviInterpretation = (value: number) => {
    if (value < 0) return { title: "Cuerpo de Agua / Nieve", color: "text-blue-600 bg-blue-50 border-blue-200", status: "Agua / Sombra", desc: "Valores negativos corresponden a cuerpos de agua, sombras profundas o nieve/hielo." };
    if (value <= 0.2) return { title: "Suelo Desnudo / Rocas", color: "text-amber-800 bg-amber-50 border-amber-200", status: "Sin Vegetación", desc: "Característico de suelos preparados sin cubierta vegetal o estadios muy tempranos." };
    if (value <= 0.4) return { title: "Vegetación Escasa / Estrés Alto", color: "text-orange-800 bg-orange-50 border-orange-200", status: "Salud Baja", desc: "Indica vegetación dispersa, estrés hídrico severo o cultivos germinando." };
    if (value <= 0.6) return { title: "Vegetación Moderada / Crecimiento", color: "text-yellow-800 bg-yellow-50 border-yellow-200", status: "Salud Media", desc: "Desarrollo vegetal medio, típico de etapas vegetativas intermedias." };
    if (value <= 0.8) return { title: "Vegetación Sana y Vigorosa", color: "text-emerald-800 bg-emerald-50 border-emerald-200", status: "Salud Óptima", desc: "Cobertura foliar densa, alta actividad fotosintética y buen estado nutricional." };
    return { title: "Canopia Muy Densa / Máximo Vigor", color: "text-green-900 bg-green-100 border-green-300", status: "Excelente", desc: "Canopia totalmente cerrada o densidad foliar excepcional." };
  };

  const currentInterpretation = getNdviInterpretation(selectedNdvi);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Hero Section */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 rounded-2xl text-white shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-300 border-emerald-500/50 bg-emerald-950">
              Guía Técnica Agronómica
            </Badge>
            <span className="text-xs text-emerald-200 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Manual de Interpretación Satelital
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Cómo Interpretar Informes Satelitales AgroPulso</h1>
          <p className="text-emerald-100/90 text-sm max-w-3xl leading-relaxed">
            Aprenda a descifrar los indicadores estadísticos de vegetación (NDVI, NDWI), la máscara de nubes SCL de Sentinel-2 L2A y el ciclo completo de gestión por páginas en la plataforma.
          </p>
        </div>

        {/* 4-Step User Lifecycle Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b pb-3">
            <Compass className="w-5 h-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">Ciclo de Trabajo del Usuario AgroPulso (Gestión por Página)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <Sliders className="w-4 h-4 text-emerald-700" />
                1. Configuración Satelital
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Workbench de filtros Copernicus: ajuste máximo de cobertura nubosa, bandas espectrales (True Color, Infrarrojo), e índice primario (NDVI, NDWI, Radar).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-2">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                <User className="w-4 h-4 text-teal-700" />
                2. Mi Perfil & Vertical
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Personalice su rubro industrial (Agrícola, Forestal, Acuícola, Frutícola), hectáreas base y formato de informe (McKinsey, Técnico) para adaptar las recomendaciones.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 space-y-2">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-sm">
                <MapPin className="w-4 h-4 text-sky-700" />
                3. Nueva Solicitud (BBox)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Defina su predio con coordenadas exactas (Lat/Lng WGS84) o atajos regionales. El sistema calcula automáticamente el polígono BBox en hectáreas para la API Statistical.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <FileText className="w-4 h-4 text-indigo-700" />
                4. Centro de Informes
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Monitoree el estado de procesamiento, abra mapas de calor satelital interactivos, consulte la trazabilidad de píxeles despejados y descargue informes exportables.
              </p>
            </div>
          </div>
        </section>

        {/* Interactive NDVI Simulator */}
        <Card className="border-emerald-200 shadow-md">
          <CardHeader className="bg-emerald-50/50 rounded-t-xl pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-700" />
                  Simulador Interactivo de Índices NDVI
                </CardTitle>
                <CardDescription>
                  Mueva el deslizador para explorar el significado agronómico de cada rango de NDVI (-0.10 a 1.00).
                </CardDescription>
              </div>
              <Badge className="bg-emerald-800 text-white font-mono text-sm px-3 py-1">
                NDVI = {selectedNdvi.toFixed(2)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <input
                type="range"
                min="-0.10"
                max="1.00"
                step="0.05"
                value={selectedNdvi}
                onChange={(e) => setSelectedNdvi(parseFloat(e.target.value))}
                className="w-full accent-emerald-800 cursor-pointer h-2 bg-gray-200 rounded-lg"
              />
              <div className="flex justify-between text-xs text-gray-500 font-mono">
                <span>-0.10 (Agua)</span>
                <span>0.20 (Suelo)</span>
                <span>0.50 (Medio)</span>
                <span>0.80 (Vigoroso)</span>
                <span>1.00 (Máximo)</span>
              </div>
            </div>

            <div className={`p-5 rounded-xl border transition-all ${currentInterpretation.color}`}>
              <div className="flex justify-between items-start gap-4 mb-2">
                <div>
                  <h3 className="text-lg font-bold">{currentInterpretation.title}</h3>
                  <p className="text-xs opacity-90 font-medium">Estado Evaluado: {currentInterpretation.status}</p>
                </div>
                <Badge variant="outline" className="border-current font-semibold">
                  Rango Activo
                </Badge>
              </div>
              <p className="text-sm leading-relaxed">{currentInterpretation.desc}</p>
            </div>
          </CardContent>
        </Card>

        {/* Core Methodology Tabs */}
        <Tabs defaultValue="ndvi" className="w-full space-y-6">
          <TabsList className="grid grid-cols-1 sm:grid-cols-3 bg-gray-100 p-1 rounded-xl">
            <TabsTrigger value="ndvi" className="text-sm font-semibold">Índices (NDVI / NDWI)</TabsTrigger>
            <TabsTrigger value="scl" className="text-sm font-semibold">Máscara de Nubes (SCL)</TabsTrigger>
            <TabsTrigger value="confianza" className="text-sm font-semibold">Cálculo de Confianza</TabsTrigger>
          </TabsList>

          {/* Tab 1: NDVI / NDWI */}
          <TabsContent value="ndvi">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700" /> NDVI (Normalized Difference Vegetation Index)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-700">
                  <p>
                    El NDVI mide la reflectancia entre el rojo visible y el infrarrojo cercano. Las plantas sanas absorben la luz roja para la fotosíntesis y reflejan el infrarrojo cercano.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs border border-gray-200">
                    Fórmula: NDVI = (NIR - RED) / (NIR + RED)
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-600 list-disc list-inside">
                    <li>Útil para estimar vigor, densidad de canopia y biomasa acumulada.</li>
                    <li>Permite detectar diferencias intra-prediales para fertilización variable.</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-teal-700" /> NDWI (Normalized Difference Water Index)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-gray-700">
                  <p>
                    El NDWI evalúa el contenido de humedad en la vegetación y el suelo utilizando bandas del infrarrojo de onda corta (SWIR).
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg font-mono text-xs border border-gray-200">
                    Fórmula: NDWI = (NIR - SWIR) / (NIR + SWIR)
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-600 list-disc list-inside">
                    <li>Indica estrés hídrico de manera anticipada antes de ser visible a ojo desnudo.</li>
                    <li>Clave para programar turnos de riego y detectar fallas en emisores.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: SCL Cloud Masking */}
          <TabsContent value="scl">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-700" />
                  Módulo SCL (Scene Classification Layer) de Sentinel-2
                </CardTitle>
                <CardDescription>
                  AgroPulso filtra automáticamente píxeles no válidos para garantizar indicadores limpios sin sesgo por nubosidad.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-red-900 block">SCL 8 / 9: Nubes</span>
                    <p className="text-red-800">Filtrados automáticamente (Alta probabilidad de nube).</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-amber-900 block">SCL 3: Sombras</span>
                    <p className="text-amber-800">Filtrados automáticamente por distorsión de reflectancia.</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-blue-900 block">SCL 10: Cirrus</span>
                    <p className="text-blue-800">Filtrados automáticamente (Nubes altas delgadas).</p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-emerald-900 block">SCL 4 / 5: Vegetación</span>
                    <p className="text-emerald-800">Píxeles 100% válidos incluidos en el cálculo estadístico.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Confidence Rules */}
          <TabsContent value="confianza">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-700" />
                  Reglas de Clasificación de Confianza
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      Alta Confianza (&ge; 30% Píxeles Claros)
                    </div>
                    <p className="text-xs text-emerald-900/90 leading-relaxed">
                      El polígono cuenta con una muestra suficiente de superficie despejada. El promedio reportado es altamente representativo de la salud real del lote.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/60 space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <AlertTriangle className="w-5 h-5 text-amber-700" />
                      Confianza Baja (&lt; 30% Píxeles Claros)
                    </div>
                    <p className="text-xs text-amber-900/90 leading-relaxed">
                      La alta presencia de nubes ocultó la mayor parte de la parcela. Se recomienda esperar a la siguiente pasada de Sentinel-2 (4–5 días) o utilizar Sentinel-1 Radar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
