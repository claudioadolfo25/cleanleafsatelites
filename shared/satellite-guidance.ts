import type { SatelliteId, Vertical } from "./satellite-catalog";
type GuidanceSector = Vertical | "emergencias";

export type NeedId = "vigor" | "nubosidad" | "riego" | "inundacion" | "acuicultura" | "sequia_regional" | "forestal";

export type SatelliteGuidance = {
  satellite: SatelliteId;
  type: string;
  resolution: string;
  revisit: string;
  idealFor: string[];
  limitations: string[];
  whyChoose: string;
  phase: "mvp" | "fase_2";
};

export const satelliteGuidance: Record<SatelliteId, SatelliteGuidance> = {
  "sentinel-2": {
    satellite: "sentinel-2", type: "Óptico", resolution: "10 m en bandas principales", revisit: "aprox. 5 días",
    idealFor: ["Vigor vegetativo", "Cereales, frutales y hortalizas", "Seguimiento visual del cultivo"],
    limitations: ["No observa a través de nubes", "Necesita luz solar y una escena despejada"],
    whyChoose: "Es la mejor primera lectura cuando se necesita detalle del estado de la vegetación.", phase: "mvp",
  },
  "sentinel-1": {
    satellite: "sentinel-1", type: "Radar", resolution: "aprox. 5–20 m según producto", revisit: "aprox. 6 días",
    idealFor: ["Humedad y estructura del terreno", "Continuidad con nubosidad", "Riego, drenaje y encharcamientos"],
    limitations: ["La señal radar requiere interpretación especializada", "No reemplaza todos los índices ópticos de vegetación"],
    whyChoose: "Es el complemento correcto cuando las nubes interrumpen Sentinel-2 o se necesita leer humedad y estructura.", phase: "mvp",
  },
  "sentinel-3": {
    satellite: "sentinel-3", type: "Térmico y color oceánico", resolution: "escala regional; no predios pequeños", revisit: "aprox. 1–2 días",
    idealFor: ["Temperatura superficial del mar", "Clorofila-a y contexto acuícola", "Sequía y contexto regional"],
    limitations: ["No es adecuado para un predio agrícola pequeño", "Activación productiva depende de integración fase 2"],
    whyChoose: "Conviene para preguntas marinas o regionales, no para decidir el vigor de una parcela individual.", phase: "fase_2",
  },
};

export const needOptions: Array<{ id: NeedId; label: string; question: string; recommendations: SatelliteId[]; explanation: string; verticals: GuidanceSector[] }> = [
  { id: "vigor", label: "Salud y vigor del cultivo", question: "Quiero saber cómo está creciendo mi cultivo.", recommendations: ["sentinel-2"], explanation: "Sentinel-2 entrega el detalle óptico más útil para vigor y cobertura vegetal cuando hay una escena despejada.", verticals: ["agricultura", "forestal"] },
  { id: "nubosidad", label: "Monitorear con nubes", question: "Necesito continuidad durante invierno o días nublados.", recommendations: ["sentinel-2", "sentinel-1"], explanation: "Usa Sentinel-2 como lectura principal y Sentinel-1 como respaldo radar para no perder continuidad.", verticals: ["agricultura", "forestal"] },
  { id: "riego", label: "Revisar riego y humedad", question: "Quiero comprobar si el agua está llegando al terreno.", recommendations: ["sentinel-1", "sentinel-2"], explanation: "Sentinel-1 aporta señal radar de humedad/estructura y Sentinel-2 ayuda a observar la respuesta vegetativa.", verticals: ["agricultura", "forestal"] },
  { id: "inundacion", label: "Detectar encharcamientos", question: "Quiero revisar daños después de lluvia intensa.", recommendations: ["sentinel-1"], explanation: "El radar mantiene capacidad de observación con nubosidad, condición frecuente durante una inundación.", verticals: ["agricultura", "forestal", "emergencias"] },
  { id: "acuicultura", label: "Monitorear agua y acuicultura", question: "Necesito temperatura o calidad del agua marina.", recommendations: ["sentinel-3"], explanation: "Sentinel-3 es la opción conceptual para temperatura y color oceánico; estará disponible al completar la integración marina.", verticals: ["acuicultura"] },
  { id: "sequia_regional", label: "Analizar sequía regional", question: "Quiero contexto climático más allá de un predio.", recommendations: ["sentinel-3", "sentinel-2"], explanation: "Combina contexto regional con lectura de vegetación; requiere un flujo regional y no se ejecuta automáticamente en el MVP.", verticals: ["agricultura", "forestal", "emergencias"] },
  { id: "forestal", label: "Vigilar plantaciones", question: "Quiero seguir salud y cambios en bosque o plantación.", recommendations: ["sentinel-2", "sentinel-1"], explanation: "Sentinel-2 muestra vigor y cobertura; Sentinel-1 aporta continuidad y sensibilidad a estructura bajo nubes.", verticals: ["forestal"] },
];

export function guidanceForNeed(need: NeedId) {
  return needOptions.find(option => option.id === need) ?? needOptions[0];
}
