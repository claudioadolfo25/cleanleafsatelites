import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, Bot, CheckCircle2, Download, FileText, HelpCircle, Lightbulb, MessageSquare, Search, Send, Share2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const guideSections = [
  {
    title: "1. 📊 Resumen Ejecutivo",
    description: "Síntesis de los hallazgos principales en 1 página.",
    howToRead: "Lee primero esta sección para entender el mensaje clave antes de entrar en detalles.",
    example: "Vigor vegetativo óptimo en 72% del predio con alerta de baja humedad en el sector sur.",
  },
  {
    title: "2. 🌍 Situación Actual",
    description: "Contexto del predio, condiciones climáticas y estado vegetativo.",
    howToRead: "Fíjate en las comparaciones con la temporada anterior y benchmarks de la región.",
    example: "NDVI promedio de 0,68 (+0,04 vs. promedio histórico de septiembre).",
  },
  {
    title: "3. ⚠️ Complicación / Problema Detectado",
    description: "Evidencia satelital de problemas (estrés hídrico, variabilidad de suelo, plagas).",
    howToRead: "Identifica la severidad (baja, media, alta) y el impacto potencial en tu producción.",
    example: "Estrés hídrico focalizado en 8,4 hectáreas debido a menor retención de suelo.",
  },
  {
    title: "4. 📈 Análisis y Resolución",
    description: "Tendencias, comparaciones con benchmarks y correlación con variables climáticas.",
    howToRead: "Busca patrones (ej: NDVI bajando consistentemente) y compara con predios similares.",
    example: "Inflexión negativa sostenida durante los últimos 15 días coincidiendo con falta de precipitación.",
  },
  {
    title: "5. 💡 Recomendaciones",
    description: "Acciones priorizadas por urgencia e impacto.",
    howToRead: "Comienza por las de 'Alta' prioridad (1-7 días), luego las de 'Media' (2-4 semanas).",
    example: "Aumentar frecuencia de riego por goteo en sector sur e inspeccionar tuberías secundarias.",
  },
  {
    title: "6. 🔍 Insights No Solicitados",
    description: "Hallazgos adicionales que el satélite detectó (variabilidad de suelo, vigor anormal).",
    howToRead: "Evalúa si estos insights requieren acción inmediata o pueden esperar.",
    example: "Variabilidad de textura de suelo observada en la franja este que afecta la uniformidad del brote.",
  },
  {
    title: "7. 📎 Apéndice Técnico",
    description: "Datos satelitales usados, fórmulas de índices y limitaciones del análisis.",
    howToRead: "Úsalo como referencia técnica si necesitas profundizar en la metodología.",
    example: "Imágenes de Sentinel-2 L2A corregidas atmosféricamente a 10 metros de resolución espacial.",
  },
];

const glossaryConcepts = [
  {
    term: "NDVI",
    fullname: "Índice de Vegetación de Diferencia Normalizada",
    range: "0,6 - 0,9 = cultivo sano",
    definition: "Mide el vigor vegetativo y densidad del follaje verde en una escala de 0 a 1.",
  },
  {
    term: "NDMI",
    fullname: "Índice de Diferencia Normalizada de Humedad",
    range: "> 0,3 = humedad adecuada",
    definition: "Mide la humedad contenida en el follaje celular vegetal (-1 a 1).",
  },
  {
    term: "σ⁰ VV",
    fullname: "Backscatter Radar Sentinel-1",
    range: "-18 a -12 dB = humedad normal",
    definition: "Medición radar que penetra cobertura de nubes para evaluar estructura y humedad del suelo.",
  },
  {
    term: "SST",
    fullname: "Temperatura Superficial del Mar",
    range: "> 14°C = riesgo térmico",
    definition: "Temperatura en la capa superficial marina (°C) observada por Sentinel-3.",
  },
  {
    term: "Clorofila-a",
    fullname: "Concentración de Clorofila-a",
    range: "> 5 mg/m³ = florecimiento algal",
    definition: "Concentración de pigmento fotosintético marino para vigilar florecimiento algal y salud acuícola.",
  },
];

export default function GuideInterpreterPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "user" | "dify"; text: string }>>([
    { sender: "dify", text: "¡Hola! Soy tu especialista de interpretación Cleanleaf con tecnología Dify. Sube tu informe o hazme cualquier pregunta sobre NDVI, σ⁰ radar o recomendaciones." },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("El archivo supera el tamaño máximo permitido de 10 MB");
        return;
      }
      setUploadedFile(file);
      toast.success(`Informe ${file.name} cargado correctamente`, {
        description: "El asistente Dify analizó la estructura de tu documento.",
      });
      setChatMessages(prev => [
        ...prev,
        { sender: "dify", text: `He analizado tu informe "${file.name}". ¿Qué sección te gustaría que te explique en detalle?` },
      ]);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userText }]);
    setInputMessage("");

    setTimeout(() => {
      let difyReply = "Tu consulta ha sido procesada. En base al análisis satelital, los índices de vegetación reflejan el estado del cultivo en comparación con el promedio regional.";
      if (userText.toLowerCase().includes("ndvi")) {
        difyReply = "NDVI 0.42 indica vigor vegetativo moderado. Para cerezos o frutales en esta época, lo esperado es 0.6-0.9. Esto sugiere que tu cultivo está experimentando cierto estrés.";
      } else if (userText.toLowerCase().includes("recomendacion")) {
        difyReply = "La sección de Recomendaciones prioriza acciones por urgencia e impacto. Las marcadas como 'Alta' deben ejecutarse en 1-7 días (ej: revisión de riego).";
      }

      setChatMessages(prev => [...prev, { sender: "dify", text: difyReply }]);
    }, 600);
  };

  const filteredGlossary = glossaryConcepts.filter(
    item =>
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 text-stone-800">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-emerald-700">
          <BookOpen size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Cleanleaf Intelligence</span>
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">Guía Interactiva de Informes</h1>
        <p className="mt-2 text-sm text-stone-500">
          Aprende a interpretar tus informes satelitales con ayuda de la IA de Dify y entiende la estructura McKinsey.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Subir Informe */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UploadCloud className="text-emerald-700" size={18} /> Subir Informe para Interpretación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border-2 border-dashed border-stone-200 p-6 text-center hover:border-emerald-300 transition bg-stone-50/50">
              <FileText className="mx-auto h-10 w-10 text-stone-400" />
              <p className="mt-3 text-xs font-medium text-stone-600">
                Arrastra y suelta tu informe o <span className="text-emerald-700 font-semibold cursor-pointer">selecciona archivo</span>
              </p>
              <p className="mt-1 text-[11px] text-stone-400">Formatos aceptados: .pdf, .md, .docx · Máximo: 10 MB</p>
              <input type="file" accept=".pdf,.md,.docx" onChange={handleFileUpload} className="mt-3 block w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200" />
            </div>
            {uploadedFile ? (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <span className="truncate font-semibold">{uploadedFile.name}</span>
                <Badge className="bg-emerald-200 text-emerald-800 text-[10px]">Cargado</Badge>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Asistente Dify */}
        <Card className="border-stone-200 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="text-emerald-700" size={18} /> Asistente de Interpretación (Dify Agent)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-4">
            <div className="h-48 overflow-y-auto space-y-3 rounded-xl border border-stone-100 bg-stone-50/80 p-3 text-xs">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl p-3 leading-5 ${msg.sender === "user" ? "bg-emerald-700 text-white" : "bg-white border border-stone-200 text-stone-800 shadow-2xs"}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder="Pregunta sobre tu informe (ej: ¿Qué significa NDVI 0.42?)" className="text-xs h-10" />
              <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800">
                <Send size={14} />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Guía de Interpretación McKinsey */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="text-amber-600" size={20} />
          <h2 className="font-serif text-2xl font-bold tracking-tight">Guía de Interpretación (Estructura McKinsey)</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guideSections.map((sec, idx) => (
            <Card key={idx} className="border-stone-200 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-stone-800">{sec.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-stone-600 leading-4">{sec.description}</p>
                <div className="rounded-lg bg-stone-50 p-2.5 border border-stone-100">
                  <p className="font-semibold text-emerald-800">Cómo leerlo:</p>
                  <p className="text-stone-500 mt-0.5 leading-4">{sec.howToRead}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Glosario de Conceptos */}
      <section className="mt-10">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-emerald-700" size={20} />
            <h2 className="font-serif text-2xl font-bold tracking-tight">Glosario de Conceptos</h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar concepto (NDVI, σ⁰...)" className="pl-9 h-9 text-xs" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGlossary.map((concept, idx) => (
            <div key={idx} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-stone-800">{concept.term}</span>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{concept.range}</Badge>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-stone-400">{concept.fullname}</p>
              <p className="mt-2 text-xs text-stone-600 leading-4">{concept.definition}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Acciones de exportación */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-stone-800">¿Quieres conservar esta guía?</h3>
          <p className="text-xs text-stone-500">Descarga la guía de interpretación en PDF o compártela con tu equipo.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => toast.success("Guía descargada en PDF")} variant="outline" size="sm" className="text-xs">
            <Download size={14} className="mr-1.5" /> Descargar Guía PDF
          </Button>
          <Button onClick={() => toast.success("Enlace copiado al portapapeles")} size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-xs">
            <Share2 size={14} className="mr-1.5" /> Compartir Guía
          </Button>
        </div>
      </div>
    </div>
  );
}
