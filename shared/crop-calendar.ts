export type CropType = "maiz" | "trigo" | "avena" | "papa" | "raps" | "manzano" | "cerezo" | "pradera";

export type CropPhenologyStage = {
  stage: string;
  description: string;
  gdd_threshold: number;
  critical_tasks: string[];
};

export type CropCalendarDefinition = {
  crop: CropType;
  name: string;
  base_temperature_c: number;
  planting_months: string;
  stages: CropPhenologyStage[];
};

export const CROP_CALENDARS: Record<CropType, CropCalendarDefinition> = {
  maiz: {
    crop: "maiz",
    name: "Maíz Grano / Silo",
    base_temperature_c: 10,
    planting_months: "Octubre - Noviembre",
    stages: [
      { stage: "Emergencia (V2-V4)", description: "Nacimiento y desarrollo foliar inicial", gdd_threshold: 120, critical_tasks: ["Control de malezas pre-emergente", "Monitoreo de gusano cortador"] },
      { stage: "Crecimiento Vegetativo (V6-V12)", description: "Definición de potencial de rinde y desarrollo de raíces", gdd_threshold: 450, critical_tasks: ["Fertilización nitrogenada de cobertera", "Riego de auxilio"] },
      { stage: "Floración y Panoja (VT-R1)", description: "Emisión de panoja y estigmas. Período crítico de agua", gdd_threshold: 850, critical_tasks: ["Mantener capacidad de campo en suelo", "Vigilancia de polvillo y carbón"] },
      { stage: "Llenado de Grano (R2-R5)", description: "Acumulación de almidón", gdd_threshold: 1200, critical_tasks: ["Riego hasta punto negro", "Monitoreo de tizón foliar"] },
    ],
  },
  trigo: {
    crop: "trigo",
    name: "Trigo Harinero / Candelreal",
    base_temperature_c: 4.5,
    planting_months: "Mayo - Julio (Invierno) / Agosto (Primavera)",
    stages: [
      { stage: "Macetamiento (Z13-Z29)", description: "Desarrollo de macollos e inicio de enraizamiento profundo", gdd_threshold: 200, critical_tasks: ["Fertilización nitrogenada inicial", "Control de malezas de hoja ancha"] },
      { stage: "Encañado (Z30-Z39)", description: "Elongación de entrenudos y formación de espiga", gdd_threshold: 500, critical_tasks: ["Aplicación de fungicida para septoria y septoriosis", "Segundo fraccionamiento de N"] },
      { stage: "Espigadura y Antesis (Z55-Z69)", description: "Emergencia de espiga y polinización", gdd_threshold: 800, critical_tasks: ["Protección contra polvillo amarillo y fusarium"] },
      { stage: "Llenado de Grano (Z70-Z89)", description: "Maduración del grano", gdd_threshold: 1100, critical_tasks: ["Suspensión de aplicaciones químicas", "Evaluación de humedad para cosecha"] },
    ],
  },
  avena: {
    crop: "avena",
    name: "Avena",
    base_temperature_c: 4,
    planting_months: "Mayo - Agosto",
    stages: [
      { stage: "Emergencia y Macollaje", description: "Crecimiento vegetativo inicial", gdd_threshold: 180, critical_tasks: ["Control de malezas gramíneas"] },
      { stage: "Encañamiento", description: "Desarrollo de panícula", gdd_threshold: 450, critical_tasks: ["Fertilización de cobertera"] },
      { stage: "Panojamiento y Antesis", description: "Período sensible a sequía", gdd_threshold: 750, critical_tasks: ["Monitoreo de polvillo de la corona"] },
      { stage: "Maduración", description: "Secado de grano", gdd_threshold: 1000, critical_tasks: ["Planificación de hilerado o cosecha directa"] },
    ],
  },
  papa: {
    crop: "papa",
    name: "Papa Semilla / Consumo",
    base_temperature_c: 7,
    planting_months: "Octubre - Noviembre",
    stages: [
      { stage: "Brotación y Emergencia", description: "Desarrollo de brotes hacia la superficie", gdd_threshold: 150, critical_tasks: ["Aporca inicial", "Monitoreo de gusanos alambre"] },
      { stage: "Iniciación de Tuberización", description: "Formación de estolones y tubérculos", gdd_threshold: 400, critical_tasks: ["Riego constante", "Aplicación preventiva para Tizón Tardío (Phytophthora)"] },
      { stage: "Llenado de Tubérculos", description: "Crecimiento rápido de masa de tubérculos", gdd_threshold: 800, critical_tasks: ["Mantener humedad de suelo uniforme", "Protección fungicida contínua"] },
      { stage: "Madurez y Cosecha", description: "Senescencia de follaje y firmeza de piel", gdd_threshold: 1100, critical_tasks: ["Destrucción de follaje / Secado", "Cosecha con suelo seco"] },
    ],
  },
  raps: {
    crop: "raps",
    name: "Raps Canola",
    base_temperature_c: 5,
    planting_months: "Marzo - Abril (Otoño)",
    stages: [
      { stage: "Roseta", description: "Desarrollo vegetativo en roseta antes del invierno", gdd_threshold: 250, critical_tasks: ["Control de Malezas", "Fertilización con azufre y boro"] },
      { stage: "Elongación de Tallo", description: "Subida de tallo tras reposo invernal", gdd_threshold: 600, critical_tasks: ["Monitoreo de pololos y curculiónidos"] },
      { stage: "Floración", description: "Floración amarilla intensa", gdd_threshold: 900, critical_tasks: ["Protección contra Sclerotinia"] },
      { stage: "Maduración de Silicuas", description: "Llenado de grano oleaginoso", gdd_threshold: 1250, critical_tasks: ["Adesecamiento o hilerado"] },
    ],
  },
  manzano: {
    crop: "manzano",
    name: "Manzano",
    base_temperature_c: 6,
    planting_months: "Permanente (Frutal)",
    stages: [
      { stage: "Brotación y Yema Hinchada", description: "Apertura de yemas tras acumulación de horas frío", gdd_threshold: 100, critical_tasks: ["Tratamientos de cobre preventivos para venturia"] },
      { stage: "Floración y Cuaja", description: "Apertura floral y polinización", gdd_threshold: 300, critical_tasks: ["Polinización con abejas", "Raleo de frutos"] },
      { stage: "Desarrollo de Fruto", description: "Elongación y división celular del fruto", gdd_threshold: 700, critical_tasks: ["Control de polilla de la manzana (Cydia pomonella)", "Riego programado por ET₀"] },
      { stage: "Maduración y Cosecha", description: "Acumulación de azúcares y color", gdd_threshold: 1200, critical_tasks: ["Pruebas de almidón y presión", "Cosecha selectiva"] },
    ],
  },
  cerezo: {
    crop: "cerezo",
    name: "Cerezo",
    base_temperature_c: 7,
    planting_months: "Permanente (Frutal)",
    stages: [
      { stage: "Yema Blanca y Floración", description: "Apertura floral rápida primaveral", gdd_threshold: 120, critical_tasks: ["Protección contra heladas tardías", "Control de cáncer bacteriano"] },
      { stage: "Cuaja y Endurecimiento de Carozo", description: "Formación de carozo y división celular inicial", gdd_threshold: 350, critical_tasks: ["Fertilización foliar con calcio y boro"] },
      { stage: "Crecimiento Rápido y Color", description: "Viraje de color de verde a rojo/púrpura", gdd_threshold: 650, critical_tasks: ["Aplicación de cubiertas anti-lluvia", "Monitoreo de Drosophila suzukii"] },
      { stage: "Cosecha y Post-Cosecha", description: "Recolección y acumulación de reservas otoñales", gdd_threshold: 900, critical_tasks: ["Riego de post-cosecha", "Fertilización nitrogenada de reserva"] },
    ],
  },
  pradera: {
    crop: "pradera",
    name: "Pradera Permanente / Mezcla Forrajera",
    base_temperature_c: 4,
    planting_months: "Marzo - Mayo",
    stages: [
      { stage: "Rebrote Primaveral / Inicial", description: "Inicio de crecimiento activo post-invierno", gdd_threshold: 100, critical_tasks: ["Fertilización nitrogenada de estimulación"] },
      { stage: "Crecimiento Vegetativo Exponencial", description: "Máxima acumulación de materia seca (MS)", gdd_threshold: 300, critical_tasks: ["Pastoreo rotacional en punto óptimo (3 hojas en ballica)"] },
      { stage: "Pre-Espigadura", description: "Inicio de elongación foliar reproductiva", gdd_threshold: 500, critical_tasks: ["Corte para ensilaje o heno"] },
      { stage: "Rezago de Verano / Reposo", description: "Baja de tasa de crecimiento por temperatura/sequía", gdd_threshold: 800, critical_tasks: ["Manejo de carga animal", "Riego estratégico si disponible"] },
    ],
  },
};

export function calculateGDD(tMax: number, tMin: number, baseTemp: number): number {
  const avgTemp = (tMax + tMin) / 2;
  const gdd = avgTemp - baseTemp;
  return gdd > 0 ? Number(gdd.toFixed(1)) : 0;
}

export function getCurrentPhenologyStage(
  crop: CropType,
  plantingDateStr: string,
  weatherDays: Array<{ date: string; temp_max_c: number; temp_min_c: number }>
): {
  currentStage: CropPhenologyStage;
  accumulatedGDD: number;
  nextStageGDD: number;
  progressPct: number;
} {
  const cal = CROP_CALENDARS[crop] ?? CROP_CALENDARS.maiz;
  const plantingDate = new Date(plantingDateStr);

  let accumulatedGDD = 0;
  for (const w of weatherDays) {
    const wDate = new Date(w.date);
    if (wDate >= plantingDate) {
      accumulatedGDD += calculateGDD(w.temp_max_c, w.temp_min_c, cal.base_temperature_c);
    }
  }

  accumulatedGDD = Number(accumulatedGDD.toFixed(1));

  let currentStage = cal.stages[0];
  let nextStageGDD = cal.stages[0].gdd_threshold;

  for (let i = 0; i < cal.stages.length; i++) {
    if (accumulatedGDD >= cal.stages[i].gdd_threshold) {
      currentStage = cal.stages[i];
      nextStageGDD = cal.stages[i + 1]?.gdd_threshold ?? cal.stages[i].gdd_threshold * 1.2;
    }
  }

  const prevThreshold = cal.stages.find(s => s.stage === currentStage.stage)?.gdd_threshold ?? 0;
  const span = nextStageGDD - prevThreshold;
  const progressPct = span > 0 ? Math.min(100, Math.max(0, Math.round(((accumulatedGDD - prevThreshold) / span) * 100))) : 100;

  return {
    currentStage,
    accumulatedGDD,
    nextStageGDD,
    progressPct,
  };
}
