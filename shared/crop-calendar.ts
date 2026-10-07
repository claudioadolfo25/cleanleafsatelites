export type CropType = "maiz" | "trigo" | "avena" | "papa" | "raps" | "manzano" | "cerezo" | "pradera";

export type CropPhenologyResult = {
  crop: CropType;
  sowingDate: string;
  accumulatedGdd: number;
  currentStage: string;
  nextStageThresholdGdd: number;
  agronomicTasks: string[];
  provenance: {
    data_source: "estimated";
    badge_label: string;
    confidence: number;
  };
};

export function calculateCropStage(crop: CropType, sowingDate: string, gdd: number): CropPhenologyResult {
  return {
    crop,
    sowingDate,
    accumulatedGdd: gdd,
    currentStage: gdd > 400 ? "Floración / Llenado de grano" : "Desarrollo vegetativo V4-V6",
    nextStageThresholdGdd: 650,
    agronomicTasks: [
      "Monitorear índice de estrés hídrico NDWI",
      "Aplicar fertilización nitrogenada según curva de extracción",
      "Verificar presencia de plagas foliares",
    ],
    provenance: {
      data_source: "estimated",
      badge_label: "GDD MODELO FENOLÓGICO",
      confidence: 0.9,
    },
  };
}
