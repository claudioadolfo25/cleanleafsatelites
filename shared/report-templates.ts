import { satelliteCatalog, SatelliteId, Vertical } from "./satellite-catalog";

export type IndustrialVertical = "agricola" | "forestal" | "acuicola" | "ganadero" | "fruticola";

export interface VerticalReportProfile {
  verticalKey: IndustrialVertical;
  label: string;
  mappedVertical: Vertical;
  primaryMission: SatelliteId;
  secondaryMissions: SatelliteId[];
  keyVariables: string[];
  reportTitleTemplate: string;
  recommendedFormat: "mckinsey" | "copernicus" | "tecnico";
  customAgronomicDirectives: string[];
}

export const VERTICAL_REPORT_PROFILES: Record<IndustrialVertical, VerticalReportProfile> = {
  forestal: {
    verticalKey: "forestal",
    label: "Forestal / Madera & Biomasa",
    mappedVertical: "forestal",
    primaryMission: "sentinel-2",
    secondaryMissions: ["sentinel-1"],
    keyVariables: ["NDVI (Índice de Vigor)", "NDMI (Estrés Hídrico y Follaje)", "σ⁰ VH (Radar Estructura de Canopia)"],
    reportTitleTemplate: "Informe de Cobertura de Dosel y Biomasa Forestal",
    recommendedFormat: "mckinsey",
    customAgronomicDirectives: [
      "Monitorear densidad de copa y riesgo de defoliación en pino/eucaliptus.",
      "Usar radar Sentinel-1 C-Band para penetración de nubes en épocas invernales.",
      "Calcular índice de estrés hídrico de follaje (NDMI) para prevención de incendios."
    ],
  },
  acuicola: {
    verticalKey: "acuicola",
    label: "Acuícola / Calidad de Agua & Costas",
    mappedVertical: "acuicultura",
    primaryMission: "sentinel-3",
    secondaryMissions: ["sentinel-2"],
    keyVariables: ["SST (Temperatura Superficial de Agua)", "Clorofila-a (Riesgo FAN)", "NDWI (Espejo de Agua)"],
    reportTitleTemplate: "Informe de Calidad de Agua, LST y Riesgo Algal (FAN)",
    recommendedFormat: "mckinsey",
    customAgronomicDirectives: [
      "Alertar sobre cambios súbitos de temperatura superficial (SST > 18°C) que desencadenen floraciones de algas nocivas (FAN).",
      "Monitorear concentración de clorofila-a en zonas de balsas/jaulas de salmónidos y embalses.",
      "Evaluar turbidez y sólidos en suspensión con banda óptica Sentinel-2."
    ],
  },
  agricola: {
    verticalKey: "agricola",
    label: "Agrícola Tradicional / Cereales",
    mappedVertical: "agricultura",
    primaryMission: "sentinel-2",
    secondaryMissions: ["sentinel-1"],
    keyVariables: ["NDVI (Vigor Vegetativo)", "EVI (Alta Biomasa)", "σ⁰ VV (Humedad Superficial)"],
    reportTitleTemplate: "Informe de Salud Vegetal, Clorofila y Nutrición Foliar",
    recommendedFormat: "copernicus",
    customAgronomicDirectives: [
      "Evaluar curva fenológica en etapas críticas (macollamiento, espigado, llenado de grano).",
      "Correlacionar caídas de NDVI con posible deficiencia de nitrógeno o estrés hídrico.",
      "Utilizar Sentinel-1 para verificar humedad de suelo antes de la fertilización."
    ],
  },
  ganadero: {
    verticalKey: "ganadero",
    label: "Ganadero / Pasturas & Pastizales",
    mappedVertical: "agricultura",
    primaryMission: "sentinel-2",
    secondaryMissions: ["sentinel-1"],
    keyVariables: ["NDVI (Vigor Forrajero)", "SAVI (Pasturas Esparsas)", "σ⁰ VV (Humedad Suelo)"],
    reportTitleTemplate: "Informe de Oferta Forrajera y Regeneración de Pasturas",
    recommendedFormat: "tecnico",
    customAgronomicDirectives: [
      "Calcular materia seca disponible por hectárea antes de la entrada del ganado.",
      "Evaluar la tasa de rebrote post-pastoreo rotativo en cada potrero.",
      "Identificar zonas de compactación o sobrepastoreo con índice SAVI."
    ],
  },
  fruticola: {
    verticalKey: "fruticola",
    label: "Frutícola / Cultivos de Alto Valor",
    mappedVertical: "agricultura",
    primaryMission: "sentinel-2",
    secondaryMissions: ["sentinel-3"],
    keyVariables: ["NDVI (10m Res)", "NDWI (Estrés Hídrico en Floración)", "LST (Estrés Térmico)"],
    reportTitleTemplate: "Informe Frutícola de Precisión y Heterogeneidad por Cuartel",
    recommendedFormat: "mckinsey",
    customAgronomicDirectives: [
      "Segmentar la variabilidad espacial intra-cuartel para zonificar la cosecha.",
      "Monitorear estrés hídrico crítico en momentos de cuajado y floración.",
      "Revisar mapas de temperatura para prevenir daños por heladas tardías."
    ],
  },
};

export function getProfileVerticalRecommendations(vertical: IndustrialVertical): VerticalReportProfile {
  return VERTICAL_REPORT_PROFILES[vertical] || VERTICAL_REPORT_PROFILES.agricola;
}
