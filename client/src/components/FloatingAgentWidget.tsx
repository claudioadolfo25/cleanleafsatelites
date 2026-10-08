import { useState } from "react";
type SpecialistPersona = "ernestocruz" | "sentinel1" | "sentinel2" | "sentinel3" | "orientador";

const SPECIALISTS: Record<SpecialistPersona, { name: string; badge: string; initialGreeting: string }> = {
  orientador: {
    name: "Guía AgroPulso",
    badge: "Guía General",
    initialGreeting: "¡Hola! Te orientaré para configurar tus terrenos y seleccionar satélites."
  },
  ernestocruz: {
    name: "Don Ernesto Cruz",
    badge: "Alto Rendimiento",
    initialGreeting: "¡Hola! Soy Don Ernesto Cruz. Vamos a maximizar la salud del suelo y el rendimiento."
  },
  sentinel1: {
    name: "Radar Sentinel-1",
    badge: "Radar C-Band",
    initialGreeting: "Firma radar Sentinel-1 activa. Penetración de nubes para humedad de suelo."
  },
  sentinel2: {
    name: "Óptico Sentinel-2",
    badge: "Alta Res. 10m",
    initialGreeting: "Sensor MSI Sentinel-2 listo para evaluar vegetación, NDVI y clorofila."
  },
  sentinel3: {
    name: "Térmico Sentinel-3",
    badge: "SLSTR / OLCI",
    initialGreeting: "Instrumentos OLCI/SLSTR en línea para macroclima y temperatura del agua."
  }
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, X, MessageSquare, Sparkles, User, ChevronUp } from "lucide-react";

export default function FloatingAgentWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<SpecialistPersona>("ernestocruz");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    { sender: "bot", text: SPECIALISTS.ernestocruz.initialGreeting },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const activePersona = SPECIALISTS[selectedPersona];

  const handleSelectPersona = (persona: SpecialistPersona) => {
    setSelectedPersona(persona);
    const spec = SPECIALISTS[persona];
    setMessages((prev) => [...prev, { sender: "bot", text: spec.initialGreeting }]);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input;
    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setIsTyping(true);

    setTimeout(() => {
      let botReply = "";
      if (selectedPersona === "ernestocruz") {
        botReply = `[Don Ernesto Cruz]: Para responder a "${userText}", recuerde revisar la aireación del suelo y la nutrición foliar. ¡Cuidar la raíz es la clave del rendimiento!`;
      } else if (selectedPersona === "sentinel1") {
        botReply = `[Sentinel-1 Radar]: Analizando la retrodifusión C-Band para "${userText}". La señal radar penetra nubes y muestra constante dieléctrica estable.`;
      } else if (selectedPersona === "sentinel2") {
        botReply = `[Sentinel-2 Óptico]: Evaluando reflectancia de bandas B4/B8 para "${userText}". NDVI y cobertura con píxeles limpios según máscara SCL.`;
      } else {
        botReply = `[Sentinel-3 Térmico]: Lectura LST macroclimática evaluada para "${userText}". Tendencias de temperatura dentro de la norma.`;
      }

      setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Expanded Floating Drawer */}
      {isOpen && (
        <div className="mb-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[520px] transition-all animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-800 text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  Agente IA Agrónomo
                  <Badge className="bg-emerald-800 text-[10px] text-white py-0 px-1.5">Live</Badge>
                </div>
                <div className="text-[10px] text-emerald-200">{activePersona.name}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 rounded-full h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Specialist Mode Pills */}
          <div className="bg-slate-100 p-2 flex gap-1 overflow-x-auto border-b border-slate-200">
            {(Object.keys(SPECIALISTS) as SpecialistPersona[]).map((key) => {
              const spec = SPECIALISTS[key];
              const isSelected = selectedPersona === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectPersona(key)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {spec.badge}
                </button>
              );
            })}
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    m.sender === "user" ? "bg-slate-800 text-white" : "bg-emerald-800 text-white"
                  }`}
                >
                  {m.sender === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </div>
                <div
                  className={`p-2.5 rounded-xl max-w-[80%] leading-relaxed ${
                    m.sender === "user"
                      ? "bg-emerald-800 text-white rounded-tr-none"
                      : "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                <Bot className="w-3.5 h-3.5 animate-pulse" /> Escribiendo respuesta...
              </div>
            )}
          </div>

          {/* Input Footer */}
          <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <Input
              placeholder={`Consultar a ${activePersona.badge}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="text-xs h-9"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-emerald-800 hover:bg-emerald-900 text-white h-9 px-3"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating Action Launcher Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full h-14 w-14 bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-xl hover:scale-105 transition-all p-0 flex items-center justify-center border-2 border-emerald-400"
      >
        {isOpen ? <ChevronUp className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
      </Button>
    </div>
  );
}
