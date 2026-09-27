import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUserProfile, VERTICAL_DETAILS } from "../lib/userProfile";
import { DOMAIN_AGENTS_CATALOG, DomainAgentId } from "@shared/domain-agents";
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
  RotateCcw,
  CloudSun,
  Dna,
  Sprout,
  ShieldAlert,
  Wrench,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface AgentUIConfig {
  id: DomainAgentId;
  badge: string;
  icon: any;
  color: string;
  borderColor: string;
  bgLight: string;
  samplePrompts: string[];
  initialGreeting: string;
}

const AGENTS_UI: Record<DomainAgentId, AgentUIConfig> = {
  orchestrator: {
    id: "orchestrator",
    badge: "Consenso & Trazabilidad",
    icon: Layers,
    color: "text-emerald-700",
    borderColor: "border-emerald-600",
    bgLight: "bg-emerald-50/70",
    samplePrompts: [
      "¿Cuál es la recomendación consolidada para mi lote según los especialistas?",
      "Evaluar si la etapa satelital discrepa con el calendario térmico.",
      "Verificar alertas prioritarias no recuperables en mi ventana activa.",
    ],
    initialGreeting:
      "Agente Orquestador Central activo. Coordino las consultas entre los 6 agentes especialistas, aplico el motor de confianza auditable y garantizo trazabilidad de origen.",
  },
  data_sensors: {
    id: "data_sensors",
    badge: "Sentinel-1/2 SAR/MSI",
    icon: Radar,
    color: "text-sky-600",
    borderColor: "border-sky-500",
    bgLight: "bg-sky-50/60",
    samplePrompts: [
      "¿Cuál es el valor NDVI medio y el porcentaje de píxeles despejados SCL?",
      "Fusión Sentinel-1 Radar para estimar humedad de suelo con nubes.",
      "Estimación satelital de etapa fenológica en mi polígono.",
    ],
    initialGreeting:
      "Agente de Datos/Sensores en línea. Proceso imágenes Sentinel-1/2, calculo NDVI/NDRE/NDWI y entrego la señal física del lote junto con su nivel de confianza.",
  },
  climate: {
    id: "climate",
    badge: "Meteorología & GDD",
    icon: CloudSun,
    color: "text-amber-600",
    borderColor: "border-amber-500",
    bgLight: "bg-amber-50/60",
    samplePrompts: [
      "¿Cuántos Grados Días Desarrollo (GDD) acumula el lote desde siembra?",
      "Contraste entre etapa estimada por clima vs etapa observada por satélite.",
      "Balance hídrico y precipitaciones acumuladas en la ventana reciente.",
    ],
    initialGreeting: "Agente de Clima listo. Monitoreo la acumulación térmica GDD y precipitaciones para proyectar el calendario fenológico esperado de tu cultivo.",
  },
  genetics: {
    id: "genetics",
    badge: "Densidad & Variedades",
    icon: Dna,
    color: "text-indigo-600",
    borderColor: "border-indigo-500",
    bgLight: "bg-indigo-50/60",
    samplePrompts: [
      "¿La densidad objetivo de 85,000 plantas/ha es segura para mi híbrido?",
      "Criterios de tolerancia a acame y comportamiento de canopia.",
      "Rango óptimo de plantas/ha según la zona de mi predio.",
    ],
    initialGreeting:
      "Agente de Genética y Variedades activo. Evalúo rangos de densidad poblacional recomendable por híbrido sin favorecer marcas comerciales.",
  },
  nutrition: {
    id: "nutrition",
    badge: "Curvas N/P/K & Ventana R1",
    icon: Sprout,
    color: "text-emerald-600",
    borderColor: "border-emerald-500",
    bgLight: "bg-emerald-50/60",
    samplePrompts: [
      "¿Estamos en la ventana crítica no recuperable R1 de nutrición?",
      "Curva de absorción foliar N-K para la etapa fenológica actual.",
      "Sugerencias de nutrición balanceada Ca/Mg para el lote.",
    ],
    initialGreeting:
      "Agente de Nutrición en línea. Analizo las curvas de absorción por etapa fenológica para alertar sobre ventanas críticas no recuperables como R1.",
  },
  health: {
    id: "health",
    badge: "Detección de Anomalías",
    icon: ShieldAlert,
    color: "text-rose-600",
    borderColor: "border-rose-500",
    bgLight: "bg-rose-50/60",
    samplePrompts: [
      "Análisis de caída focalizada de vigor no explicada por clima.",
      "Interpretación de fotos de terreno para descartar mancha foliar.",
      "Alerta de revisión presencial en subzonas del lote.",
    ],
    initialGreeting:
      "Agente de Sanidad listo. Detecto anomalías espectrales focales y caídas atípicas de vigor para orientar inspecciones de campo oportunamente.",
  },
  management: {
    id: "management",
    badge: "Calendario Operativo",
    icon: Wrench,
    color: "text-teal-600",
    borderColor: "border-teal-500",
    bgLight: "bg-teal-50/60",
    samplePrompts: [
      "Checklist operativo para la etapa fenológica actual.",
      "Calendarización de fajas y pulverización post-floración.",
      "Programación de cosechas seguras según humedad estimada.",
    ],
    initialGreeting:
      "Agente de Manejo y Mecanización activo. Planifico el calendario del ciclo operativo y genero listas de verificación para labores de campo.",
  },
};

export default function AgentPage() {
  const { profile } = useUserProfile();
  const [selectedAgent, setSelectedAgent] = useState<DomainAgentId>("orchestrator");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string; agentId: DomainAgentId }>>([
    {
      sender: "bot",
      text: `¡Hola ${profile.nombre}! Soy el **Agente Orquestador Central**. Tengo cargado tu perfil: **Vertical ${VERTICAL_DETAILS[profile.vertical].label}** (${profile.superficieHectareas} ha en ${profile.regionUbicacion}). ¿Qué especialista deseas consultar hoy?`,
      agentId: "orchestrator",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const activeAgentConfig = AGENTS_UI[selectedAgent];
  const activeAgentDef = DOMAIN_AGENTS_CATALOG[selectedAgent];

  const handleSelectAgent = (agentId: DomainAgentId) => {
    setSelectedAgent(agentId);
    const config = AGENTS_UI[agentId];
    setMessages((prev) => [...prev, { sender: "bot", text: config.initialGreeting, agentId }]);
    toast.info(`Agente activo: ${config.badge}`);
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg = { sender: "user" as const, text: query, agentId: selectedAgent };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");

    setIsTyping(true);

    setTimeout(() => {
      let botReply = "";
      if (selectedAgent === "orchestrator") {
        botReply = `[Agente Orquestador Central]: Consolidando informe para predio de **${profile.superficieHectareas} ha** en **${profile.regionUbicacion}**:
1. **Agente de Datos/Sensores**: Confianza ALTA (NDVI: 0.74, SCL despejado: 92%).
2. **Agente de Clima**: GDD acumulados coinciden con floración (880 GDD).
3. **Agente de Nutrición**: ALERTA R1 - Ventana no recuperable en marcha. Se sugiere mantener humedad a capacidad de campo y nivelar Ca/Mg.
Origen de respuesta: Orquestador + Datos + Nutrición (Confianza: ALTA).`;
      } else if (selectedAgent === "data_sensors") {
        botReply = `[Agente de Datos/Sensores]: Análisis espectral ejecutado sobre ${profile.superficieHectareas} ha. NDVI medio: 0.72. Cobertura SCL con 95% píxeles válidos. Señal radar Sentinel-1 confirma rugosidad foliar homogénea.`;
      } else if (selectedAgent === "climate") {
        botReply = `[Agente de Clima]: Balance térmico acumulado para ${profile.regionUbicacion}: 880 GDD. Lluvia mensual acumulada: 45 mm. Etapa proyectada por calendario térmico: R1 Floración.`;
      } else if (selectedAgent === "genetics") {
        botReply = `[Agente de Genética/Variedades]: Criterio evaluado para la vertical ${profile.vertical}. La densidad poblacional óptima se ubica en el rango de 70,000 - 80,000 plantas/ha para maximizar arquitectura foliar sin generar vulnerabilidad de tallo.`;
      } else if (selectedAgent === "nutrition") {
        botReply = `[Agente de Nutrición]: Etapa activa R1 detectada. Recordatorio de regla dura: No prescribo marcas ni dosis exactas, pero la curva de absorción indica demanda pico de N y K. Mantener irrigación continua.`;
      } else if (selectedAgent === "health") {
        botReply = `[Agente de Sanidad]: Monitoreo de anomalías espaciales: Sin caídas atípicas bruscas de vigor. Muestra fotográfica o firma infrarroja dentro de parámetros sanos.`;
      } else {
        botReply = `[Agente de Manejo/Mecanización]: Checklist para la etapa R1: Revisar emisores de fertirriego, verificar fajas de pulverización y preparar maquinaria de cosecha para la ventana proyectada en 35 días.`;
      }

      setMessages((prev) => [...prev, { sender: "bot", text: botReply, agentId: selectedAgent }]);
      setIsTyping(false);
    }, 850);
  };

  const resetChat = () => {
    setMessages([
      {
        sender: "bot",
        text: `Conversación reiniciada con el **${activeAgentDef.name}**. ¿En qué puedo colaborar para tu predio de **${profile.superficieHectareas} ha**?`,
        agentId: selectedAgent,
      },
    ]);
    toast.success("Conversación reiniciada");
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header Hero Banner with Domain Agent Architecture */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 p-8 rounded-2xl text-white shadow-xl space-y-4 border border-emerald-800/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-semibold">
                Ecosistema de Agentes por Dominio
              </Badge>
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal-400" /> Trazabilidad & Motor de Confianza
              </Badge>
            </div>

            <Button onClick={resetChat} variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reiniciar Chat
            </Button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight">Ecosistema de Agentes Especialistas</h1>
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                Consulte al Agente Orquestador o a los 6 especialistas por dominio (Datos, Clima, Genética, Nutrición, Sanidad, Manejo).
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

        {/* Domain Agents Grid Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {(Object.keys(AGENTS_UI) as DomainAgentId[]).map((key) => {
            const agentConfig = AGENTS_UI[key];
            const agentDef = DOMAIN_AGENTS_CATALOG[key];
            const isSelected = selectedAgent === key;
            const Icon = agentConfig.icon;

            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all shadow-xs ${
                  isSelected ? `border-2 ${agentConfig.borderColor} ring-2 ring-emerald-500/20 bg-emerald-50/40` : "border-slate-200 hover:border-emerald-300"
                }`}
                onClick={() => handleSelectAgent(key)}
              >
                <CardHeader className="p-2.5 pb-1">
                  <div className="flex items-center justify-between">
                    <div className={`p-1.5 rounded-lg bg-white ${agentConfig.color} shadow-xs border border-slate-100`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <CardTitle className="text-xs font-bold text-slate-900 mt-1.5 leading-tight">{agentDef.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-2.5 pt-0">
                  <Badge variant="outline" className="text-[8px] font-bold px-1 py-0 truncate w-full block text-center">
                    {agentConfig.badge}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Agent Chat Window */}
        <Card className="border-slate-200/80 shadow-md">
          <CardHeader className={`border-b border-slate-100 rounded-t-xl ${activeAgentConfig.bgLight} p-5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-white shadow-xs border border-slate-200 ${activeAgentConfig.color}`}>
                  <activeAgentConfig.icon className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">{activeAgentDef.name}</CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-600">
                    {activeAgentDef.role} — {activeAgentDef.knowledgeDomain}
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-800 text-white text-xs px-3 py-1">Especialista Activo</Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Prohibitions & Hard Rules Badge */}
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                Reglas y Límites de Conocimiento Asignado:
              </span>
              <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                {activeAgentDef.prohibitions.map((p, idx) => (
                  <li key={idx}>{p}</li>
                ))}
              </ul>
            </div>

            {/* Contextual Suggested Prompts */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" /> Consultas Recomendadas:
              </span>
              <div className="flex flex-wrap gap-2">
                {activeAgentConfig.samplePrompts.map((prompt, idx) => (
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
                      {msg.sender === "user" ? "Usted (" + profile.nombre + ")" : DOMAIN_AGENTS_CATALOG[msg.agentId].name}
                    </div>
                    <div className="whitespace-pre-line text-xs font-normal">{msg.text}</div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium animate-pulse p-2 bg-emerald-50 rounded-lg w-fit">
                  <Bot className="w-4 h-4" /> {activeAgentDef.name} está procesando su consulta y base de conocimiento...
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
                placeholder={`Escriba su consulta técnica para ${activeAgentDef.name}...`}
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
