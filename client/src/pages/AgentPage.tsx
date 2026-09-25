import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Bot, Radio, CloudSun, ThermometerSun, Award, Send, Sparkles, Lightbulb, CheckCircle2, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

export type SpecialistPersona = "sentinel1" | "sentinel2" | "sentinel3" | "ernestocruz";

interface SpecialistInfo {
  id: SpecialistPersona;
  name: string;
  role: string;
  badge: string;
  icon: any;
  color: string;
  borderColor: string;
  bgLight: string;
  description: string;
  samplePrompts: string[];
  initialGreeting: string;
}

export const SPECIALISTS: Record<SpecialistPersona, SpecialistInfo> = {
  sentinel1: {
    id: "sentinel1",
    name: "Especialista Radar Sentinel-1",
    role: "Teledetección Microondas & Humedad",
    badge: "Radar C-Band",
    icon: Radio,
    color: "text-sky-700",
    borderColor: "border-sky-300",
    bgLight: "bg-sky-50/60",
    description: "Experto en firmas de retrodispersión radar (polarización VV / VH). Ideal para monitoreo de humedad de suelo, inundaciones y rugosidad sin interferencia de nubes.",
    samplePrompts: [
      "¿Cómo interpreto una caída abrupta de retrodispersión VV en mi predio?",
      "¿Qué diferencia hay entre usar VV vs VH para monitorear humedad de suelo?",
      "¿Sentinel-1 puede detectar anegamientos bajo capa densa de nubes?",
    ],
    initialGreeting: "Hola. Soy tu especialista en Sentinel-1 Radar. Analizo la constante dieléctrica del suelo y la estructura vegetal sin importar la cobertura nubosa. ¿En qué predio analizaremos hoy la señal radar?",
  },
  sentinel2: {
    id: "sentinel2",
    name: "Especialista Óptico Sentinel-2",
    role: "Salud Vegetal & Espectro Multispectral",
    badge: "Alta Res. 10m",
    icon: CloudSun,
    color: "text-emerald-700",
    borderColor: "border-emerald-300",
    bgLight: "bg-emerald-50/60",
    description: "Especialista en firmas espectrales visible e infrarrojo cercano (NIR/SWIR). Diagnostica NDVI, NDWI, estrés hídrico y evalúa la calidad de píxel con máscara SCL.",
    samplePrompts: [
      "Mi NDVI cayó a 0.35 en Lote Maíz A1, ¿cuál es el diagnóstico probable?",
      "¿Cómo sé si la baja de NDVI es por estrés hídrico o por sombras de nubes?",
      "¿Cuándo conviene comparar NDVI con NDWI para ajustar el turno de riego?",
    ],
    initialGreeting: "Saludos agronómicos. Soy tu especialista Sentinel-2. Monitoreo vigor fotosintético, biomasa y nitrógeno foliar a 10 metros de resolución. ¿Qué zona o lote deseas inspeccionar?",
  },
  sentinel3: {
    id: "sentinel3",
    name: "Especialista Térmico Sentinel-3",
    role: "Contexto Regional & Temperatura Terrestre",
    badge: "SLSTR / OLCI",
    icon: ThermometerSun,
    color: "text-amber-700",
    borderColor: "border-amber-300",
    bgLight: "bg-amber-50/60",
    description: "Especialista en temperatura superficial de la tierra (LST) y seguimiento macroclimático de sequías o fenómenos de alcance regional.",
    samplePrompts: [
      "¿Cómo influye la anomalía de temperatura LST en la evaporación de mi cuenca?",
      "¿Sentinel-3 es adecuado para parcelas de menos de 10 hectáreas?",
      "¿Qué indicador Sentinel-3 predice olas de calor o heladas tempranas?",
    ],
    initialGreeting: "Hola. Soy tu especialista regional Sentinel-3. Evalúo temperatura de superficie terrestre y tendencias climáticas macro para contextualizar la vulnerabilidad de tus valles.",
  },
  ernestocruz: {
    id: "ernestocruz",
    name: "Don Ernesto Cruz — Asesor Agronómico",
    role: "Agronomía de Alto Rendimiento & Nutrición de Suelos",
    badge: "Alto Rendimiento",
    icon: Award,
    color: "text-amber-800",
    borderColor: "border-amber-400",
    bgLight: "bg-gradient-to-br from-amber-50 via-emerald-50 to-teal-50",
    description: "Metodología inspirada en récords de rendimiento agrícola: nutrición balanceada de suelos, densidad de siembra optimizada, manejo radicular y decisiones prácticas de campo.",
    samplePrompts: [
      "Don Ernesto, con un NDVI de 0.65 en maíz V6, ¿qué nutrición foliaria recomienda?",
      "¿Cómo preparo el suelo y la relación Calcio/Magnesio para aspirar a máximo rendimiento?",
      "¿Qué tips prácticos aplicar cuando el sensor marca estrés térmico antes de la floración?",
    ],
    initialGreeting: "¡Qué tal, estimado productor! Soy Ernesto Cruz. Aquí no venimos a adivinar; venimos a romper récords de rendimiento cuidando el suelo, alimentando la raíz y tomando decisiones científicas en el momento exacto. ¿Qué cultivo vamos a llevar a su máximo potencial hoy?",
  },
};

export default function AgentPage() {
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistPersona>("ernestocruz");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string; persona: SpecialistPersona }>>([
    { sender: "bot", text: SPECIALISTS.ernestocruz.initialGreeting, persona: "ernestocruz" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const activePersona = SPECIALISTS[selectedSpecialist];

  const handleSelectSpecialist = (persona: SpecialistPersona) => {
    setSelectedSpecialist(persona);
    const spec = SPECIALISTS[persona];
    setMessages((prev) => [...prev, { sender: "bot", text: spec.initialGreeting, persona }]);
    toast.info(`Cambiado a: ${spec.name}`);
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg = { sender: "user" as const, text: query, persona: selectedSpecialist };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");

    setIsTyping(true);

    setTimeout(() => {
      let botReply = "";
      if (selectedSpecialist === "ernestocruz") {
        botReply = `[Consejo Ernesto Cruz]: Para responder a tu consulta "${query}", el secreto está en mirar la raíz. Si combinamos el mapa NDVI con un análisis de aireación del suelo y nutrición foliar equilibrada (Relación Ca/Mg 3:1), vas a desbloquear el potencial metabólico del cultivo. ¡Recuerda que la planta responde al eslabón más débil!`;
      } else if (selectedSpecialist === "sentinel1") {
        botReply = `[Sentinel-1 Radar]: Analizando la firma de retrodifusión para "${query}". En C-Band (5.4 GHz), los valores de VV de -12 dB a -15 dB sugieren humedad superficial óptima sin saturación. La señal radar confirma que la estructura de canopia no muestra volumen marchito.`;
      } else if (selectedSpecialist === "sentinel2") {
        botReply = `[Sentinel-2 Óptico]: Evaluando reflectancia de bandas B4 (Rojo) y B8 (NIR) para "${query}". El índice NDVI de tu polígono PostGIS indica una fotosíntesis activa con 100% de píxeles limpios según la máscara de nubes SCL. Te sugiero revisar el mapa de variabilidad espacial.`;
      } else {
        botReply = `[Sentinel-3 Térmico]: La lectura de temperatura de superficie (LST) muestra estabilidad térmica regional. No se detectan anomalías de estrés por calor en el valle para la ventana evaluada.`;
      }

      setMessages((prev) => [...prev, { sender: "bot", text: botReply, persona: selectedSpecialist }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-8 rounded-2xl text-white shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-300 border-emerald-500/50 bg-emerald-950">
              Orquestador IA Multi-Especialista
            </Badge>
            <span className="text-xs text-emerald-200/80 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Supabase Context & Copernicus CDSE
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Centro Agente IA — AgroPulso</h1>
          <p className="text-emerald-100/90 text-sm max-w-3xl leading-relaxed">
            Consulte a nuestros agentes especializados por misión satelital o reciba orientación profesional de alto rendimiento con el método Don Ernesto Cruz.
          </p>
        </div>

        {/* Specialist Selector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(SPECIALISTS) as SpecialistPersona[]).map((key) => {
            const spec = SPECIALISTS[key];
            const isSelected = selectedSpecialist === key;
            const Icon = spec.icon;

            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all shadow-sm ${
                  isSelected ? `border-2 ${spec.borderColor} ring-2 ring-emerald-500/20` : "border-slate-200 hover:border-emerald-300"
                }`}
                onClick={() => handleSelectSpecialist(key)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl bg-white ${spec.color} shadow-sm border border-slate-100`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {spec.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-2">{spec.name}</CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-500">{spec.role}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-600 line-clamp-3">{spec.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Active Specialist Chat Interface */}
        <Card className="border-slate-200 shadow-md">
          <CardHeader className={`border-b border-slate-100 rounded-t-xl ${activePersona.bgLight}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-white shadow-sm border border-slate-200 ${activePersona.color}`}>
                  <activePersona.icon className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">{activePersona.name}</CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-600">
                    {activePersona.role}
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-800 text-white text-xs px-3 py-1">Especialista Activo</Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Suggested Prompts Pill List */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Consultas Sugeridas para este Especialista:
              </span>
              <div className="flex flex-wrap gap-2">
                {activePersona.samplePrompts.map((prompt, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 rounded-full text-left font-normal"
                    onClick={() => handleSendMessage(prompt)}
                  >
                    <Lightbulb className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 min-h-[280px] max-h-[420px] overflow-y-auto space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                      msg.sender === "user" ? "bg-slate-800 text-white" : "bg-emerald-800 text-white"
                    }`}
                  >
                    {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-xs max-w-xl leading-relaxed shadow-sm ${
                      msg.sender === "user"
                        ? "bg-emerald-800 text-white rounded-tr-none"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                    }`}
                  >
                    <div className="font-bold text-[10px] opacity-75 mb-1">
                      {msg.sender === "user" ? "Usted" : SPECIALISTS[msg.persona].name}
                    </div>
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium animate-pulse">
                  <Bot className="w-4 h-4" /> El especialista está evaluando la consulta con datos satelitales...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                placeholder={`Escriba su consulta para ${activePersona.name}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 text-xs"
              />
              <Button type="submit" disabled={isTyping || !inputText.trim()} className="bg-emerald-800 hover:bg-emerald-900 text-white px-5">
                <Send className="w-4 h-4 mr-1" /> Enviar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
