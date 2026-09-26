import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUserProfile, VERTICAL_DETAILS } from "../lib/userProfile";
import {
  Bot,
  User,
  Send,
  Sparkles,
  ShieldCheck,
  Lightbulb,
  Radar,
  Eye,
  Thermometer,
  Award,
  Compass,
  Building,
  Trees,
  MapPin,
  HelpCircle,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

type SpecialistPersona = "ernestocruz" | "sentinel1" | "sentinel2" | "sentinel3" | "orientador";

interface Specialist {
  id: SpecialistPersona;
  name: string;
  role: string;
  description: string;
  badge: string;
  icon: any;
  color: string;
  borderColor: string;
  bgLight: string;
  samplePrompts: string[];
  initialGreeting: string;
}

const SPECIALISTS: Record<SpecialistPersona, Specialist> = {
  orientador: {
    id: "orientador",
    name: "Guía de Plataforma & Orientador AgroPulso",
    role: "Onboarding & Tutor de Navegación",
    description: "Orientación paso a paso para configurar predios, elegir misiones satelitales y maximizar el rendimiento según tu terreno particular.",
    badge: "Guía General",
    icon: Compass,
    color: "text-blue-600",
    borderColor: "border-blue-500",
    bgLight: "bg-blue-50/60",
    samplePrompts: [
      "¿Cómo configuro mi primer predio y elijo los satélites ideales?",
      "¿Qué diferencia hay entre un informe McKinsey y uno Copernicus?",
      "¿Cómo interpreto la máscara de nubes SCL en días lluviosos?",
      "Recomiéndame los pasos exactos para mi terreno según mi perfil."
    ],
    initialGreeting: "¡Hola! Soy tu Guía de Plataforma AgroPulso. Te ayudaré a navegar el sistema, configurar tus lotes y seleccionar los mejores análisis satelitales en función de tu predio y vertical productiva."
  },
  ernestocruz: {
    id: "ernestocruz",
    name: "Don Ernesto Cruz — Asesor Agronómico",
    role: "Agronomía de Alto Rendimiento & Nutrición de Suelos",
    description: "Metodología inspirada en récords de rendimiento agrícola: nutrición balanceada Ca/Mg, balance foliar y maximización del potencial del suelo.",
    badge: "Alto Rendimiento",
    icon: Award,
    color: "text-emerald-700",
    borderColor: "border-emerald-600",
    bgLight: "bg-emerald-50/60",
    samplePrompts: [
      "Don Ernesto, con un NDVI de 0.65 en maíz V6, ¿qué nutrición foliar recomienda?",
      "¿Cómo preparo el suelo y la relación Calcio/Magnesio para aspirar a máximo rendimiento?",
      "¿Qué tips prácticos aplicar cuando el sensor marca estrés térmico antes de la floración?",
      "¿Cómo correlacionar mapas de humedad radar con la fertilización nitrogenada?"
    ],
    initialGreeting: "¡Qué tal, estimado productor! Soy Ernesto Cruz. Aquí no venimos a adivinar; venimos a romper récords de rendimiento cuidando el suelo, alimentando la raíz y tomando decisiones científicas en el momento exacto. ¿Qué cultivo vamos a llevar a su máximo potencial hoy?"
  },
  sentinel1: {
    id: "sentinel1",
    name: "Especialista Radar Sentinel-1",
    role: "Teledetección Microondas & Humedad",
    description: "Experto en firmas de retrodifusión radar (polarización VV/VH). Ideal para atravesar nubes, medir estructura vegetativa y humedad del suelo.",
    badge: "Radar C-Band",
    icon: Radar,
    color: "text-indigo-600",
    borderColor: "border-indigo-500",
    bgLight: "bg-indigo-50/60",
    samplePrompts: [
      "¿Qué significa un aumento en la retrodifusión Cross-Ratio (VH/VV) en mi lote?",
      "¿Cómo detectar la humedad del suelo bajo un cielo 100% nublado?",
      "Explicación técnica de la polarización σ⁰ VV para monitoreo de inundaciones."
    ],
    initialGreeting: "Iniciando canal Sentinel-1 SAR. La banda C de 5.4 GHz atraviesa la cobertura nubosa de tu terreno. Puedo evaluar la humedad dieléctrica del suelo y la rugosidad de la canopia sin importar el clima."
  },
  sentinel2: {
    id: "sentinel2",
    name: "Especialista Óptico Sentinel-2",
    role: "Salud Vegetal & Espectro Multiespectral",
    description: "Especialista en firmas espectrales visible e infrarrojo cercano (NIR/SWIR). Análisis de NDVI, NDWI, EVI y clorofila a 10m de resolución.",
    badge: "Alta Res. 10m",
    icon: Eye,
    color: "text-emerald-600",
    borderColor: "border-emerald-500",
    bgLight: "bg-emerald-50/60",
    samplePrompts: [
      "¿Por qué mi índice NDWI bajó bruscamente si el NDVI se mantuvo estable?",
      "¿Cómo usar las bandas B8A y B11 para medir el contenido hídrico del follaje (NDMI)?",
      "Diferencia operativa entre NDVI y EVI en parcelas de alta densidad."
    ],
    initialGreeting: "Sensor MSI Sentinel-2 listo. Analizando resoluciones espectrales de 10 y 20 metros para detectar anomalías fotosintéticas y vigor foliar temprano en tus cultivos."
  },
  sentinel3: {
    id: "sentinel3",
    name: "Especialista Térmico Sentinel-3",
    role: "Contexto Regional & Temperatura Terrestre",
    description: "Especialista en temperatura de superficie de la tierra (LST) y radiometría oceánica/acuícola (OLCI/SLSTR) para macroclima y sequías.",
    badge: "SLSTR / OLCI",
    icon: Thermometer,
    color: "text-amber-600",
    borderColor: "border-amber-500",
    bgLight: "bg-amber-50/60",
    samplePrompts: [
      "¿Cómo afecta la temperatura de la superficie terrestre (LST) al estrés térmico regional?",
      "Monitoreo de la clorofila-a y temperatura en balsas acuícolas con Sentinel-3.",
      "Análisis macroclimático de la cuenca para prever heladas o sequía prolongada."
    ],
    initialGreeting: "Instrumentos OLCI y SLSTR en línea. Monitoreo la temperatura de superficie (LST) y la calidad de cuerpos de agua para contextualizar eventos climáticos a gran escala."
  }
};

export default function AgentPage() {
  const { profile } = useUserProfile();
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistPersona>("orientador");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string; persona: SpecialistPersona }>>([
    {
      sender: "bot",
      text: `¡Hola ${profile.nombre}! He cargado tu perfil: **Vertical ${VERTICAL_DETAILS[profile.vertical].label}** (${profile.superficieHectareas} ha en ${profile.regionUbicacion}). ¿En qué puedo orientarte hoy?`,
      persona: "orientador"
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const activePersona = SPECIALISTS[selectedSpecialist];
  const verticalInfo = VERTICAL_DETAILS[profile.vertical];

  const handleSelectSpecialist = (persona: SpecialistPersona) => {
    setSelectedSpecialist(persona);
    const spec = SPECIALISTS[persona];
    setMessages((prev) => [...prev, { sender: "bot", text: spec.initialGreeting, persona }]);
    toast.info(`Agente activo: ${spec.name}`);
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
      if (selectedSpecialist === "orientador") {
        botReply = `[Guía AgroPulso]: Para tu terreno de **${profile.superficieHectareas} ha** en **${profile.regionUbicacion}** (${profile.organizacion}), te recomiendo los siguientes pasos:
1. **Configurar el Lote**: Ve al *Centro de Informes* y dibuja tu polígono.
2. **Elegir Misión Satelital**: Para tu vertical **${verticalInfo.label}**, los satélites recomendados son **${verticalInfo.satellites.join(" y ")}**.
3. **Formato de Salida**: Has configurado la preferencia de informe como **${profile.preferenciaInforme.toUpperCase()}**.
¿Quieres que revisemos alguna variable en particular?`;
      } else if (selectedSpecialist === "ernestocruz") {
        botReply = `[Consejo Ernesto Cruz]: Para responder a tu consulta "${query}" en tu predio de **${profile.superficieHectareas} ha** (${profile.vertical}), el secreto está en mirar la raíz. Si combinamos el mapa NDVI con un análisis de aireación del suelo y nutrición foliar equilibrada (Relación Ca/Mg 3:1), vas a desbloquear el potencial metabólico del cultivo. ¡Recuerda que la planta responde al eslabón más débil!`;
      } else if (selectedSpecialist === "sentinel1") {
        botReply = `[Sentinel-1 Radar]: Analizando la firma de retrodifusión para "${query}" en tu zona (${profile.regionUbicacion}). En C-Band (5.4 GHz), los valores de VV de -12 dB a -15 dB sugieren humedad superficial óptima sin saturación. La señal radar confirma que la estructura de canopia no muestra volumen marchito.`;
      } else if (selectedSpecialist === "sentinel2") {
        botReply = `[Sentinel-2 Óptico]: Evaluando reflectancia de bandas B4 (Rojo) y B8 (NIR) para "${query}". Para tu actividad de **${profile.vertical}**, el índice NDVI de tu polígono indica fotosíntesis activa con píxeles limpios según la máscara SCL. Te sugiero revisar el mapa de variabilidad espacial.`;
      } else {
        botReply = `[Sentinel-3 Térmico]: La lectura de temperatura de superficie (LST) en **${profile.regionUbicacion}** muestra estabilidad térmica regional. No se detectan anomalías de estrés por calor para la ventana evaluada.`;
      }

      setMessages((prev) => [...prev, { sender: "bot", text: botReply, persona: selectedSpecialist }]);
      setIsTyping(false);
    }, 900);
  };

  const resetChat = () => {
    setMessages([
      {
        sender: "bot",
        text: `Conversación reiniciada. ¿Cómo puedo ayudarte con tu predio de **${profile.superficieHectareas} ha** en **${profile.regionUbicacion}**?`,
        persona: selectedSpecialist
      }
    ]);
    toast.success("Conversación reiniciada");
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header Hero Banner with User Profile Context */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 p-8 rounded-2xl text-white shadow-xl space-y-4 border border-emerald-800/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-semibold">
                Asistente Virtual ChatGPT AgroPulso
              </Badge>
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal-400" /> Contexto de Terreno Activo
              </Badge>
            </div>

            <Button onClick={resetChat} variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reiniciar Chat
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight">Centro de Agentes & Orientador AgroPulso</h1>
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                Interactúe con nuestro guía de plataforma o consulte a nuestros agentes de física satelital y agronomía de alto rendimiento.
              </p>
            </div>

            {/* Live Profile Pill */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur text-xs space-y-1.5 min-w-[240px]">
              <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px] block">
                Perfil de Usuario Activo
              </span>
              <div className="flex items-center gap-2 text-white font-semibold">
                <Building className="w-3.5 h-3.5 text-emerald-400" /> {profile.organizacion}
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Trees className="w-3.5 h-3.5 text-teal-400" /> Vertical: <span className="capitalize text-white font-medium">{profile.vertical}</span> ({profile.superficieHectareas} ha)
              </div>
              <div className="flex items-center gap-2 text-slate-300 truncate">
                <MapPin className="w-3.5 h-3.5 text-amber-400" /> {profile.regionUbicacion}
              </div>
            </div>
          </div>
        </div>

        {/* Specialist Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.keys(SPECIALISTS) as SpecialistPersona[]).map((key) => {
            const spec = SPECIALISTS[key];
            const isSelected = selectedSpecialist === key;
            const Icon = spec.icon;

            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all shadow-xs ${
                  isSelected ? `border-2 ${spec.borderColor} ring-2 ring-emerald-500/20 bg-emerald-50/30` : "border-slate-200 hover:border-emerald-300"
                }`}
                onClick={() => handleSelectSpecialist(key)}
              >
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-1.5 rounded-lg bg-white ${spec.color} shadow-xs border border-slate-100`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0">
                      {spec.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">{spec.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-[11px] text-slate-500 line-clamp-2">{spec.role}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main ChatGPT-Style Chat Container */}
        <Card className="border-slate-200/80 shadow-md">
          <CardHeader className={`border-b border-slate-100 rounded-t-xl ${activePersona.bgLight} p-5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-white shadow-xs border border-slate-200 ${activePersona.color}`}>
                  <activePersona.icon className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">{activePersona.name}</CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-600">
                    {activePersona.role} — {activePersona.description}
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-800 text-white text-xs px-3 py-1">Agente Activo</Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Contextual Suggested Prompts */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Consultas Sugeridas para este Agente:
              </span>
              <div className="flex flex-wrap gap-2">
                {activePersona.samplePrompts.map((prompt, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 rounded-full text-left font-normal py-1"
                    onClick={() => handleSendMessage(prompt)}
                  >
                    <Lightbulb className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Conversation Messages Thread */}
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 min-h-[320px] max-h-[460px] overflow-y-auto space-y-4">
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
                    className={`p-4 rounded-2xl text-xs max-w-2xl leading-relaxed shadow-xs ${
                      msg.sender === "user"
                        ? "bg-emerald-800 text-white rounded-tr-none"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none space-y-1"
                    }`}
                  >
                    <div className="font-bold text-[10px] opacity-75 mb-1 flex items-center gap-1">
                      {msg.sender === "user" ? "Usted (" + profile.nombre + ")" : SPECIALISTS[msg.persona].name}
                    </div>
                    <div className="whitespace-pre-line text-xs font-normal">{msg.text}</div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium animate-pulse p-2 bg-emerald-50 rounded-lg w-fit">
                  <Bot className="w-4 h-4" /> {activePersona.name} está procesando su consulta y datos de terreno...
                </div>
              )}
            </div>

            {/* Message Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2 pt-2"
            >
              <Input
                placeholder={`Escriba su consulta o duda sobre su predio para ${activePersona.name}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 text-xs py-2.5 h-10"
              />
              <Button type="submit" disabled={isTyping || !inputText.trim()} className="bg-emerald-800 hover:bg-emerald-900 text-white px-6 h-10">
                <Send className="w-4 h-4 mr-1.5" /> Enviar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
