import rulesConfig from "./recommendation-rules.json";

export type TimeSeriesInputPoint = {
  valor: number | null;
  porcentajePixelesValidos?: number;
  nivelConfianza?: string;
  intervaloDesde?: string;
  intervaloHasta?: string;
};

export type InterpretationResult = {
  status: "ok" | "datos_insuficientes";
  valorActual: number | null;
  variacionPrevio: number | null;
  desviacionHistorica: number | null;
  heterogeneidad: number | null; // desvío / media
  nivelConfianza: "alta" | "baja_confianza";
  diagnostico: string;
  recomendaciones: Array<{
    ruleId: string;
    titulo: string;
    severidad: string;
    recomendacion: string;
  }>;
  alertsTriggered: Array<{
    ruleId: string;
    titulo: string;
    severidad: string;
    detalle: string;
  }>;
};

export function interpretTimeSeries(
  points: TimeSeriesInputPoint[],
  vertical: string = "agricultura",
  variable: string = "ndvi"
): InterpretationResult {
  const validPoints = points.filter(
    (p) => p.valor !== null && (p.porcentajePixelesValidos ?? 1.0) >= 0.6
  );

  if (validPoints.length === 0) {
    return {
      status: "datos_insuficientes",
      valorActual: null,
      variacionPrevio: null,
      desviacionHistorica: null,
      heterogeneidad: null,
      nivelConfianza: "baja_confianza",
      diagnostico: "datos insuficientes",
      recomendaciones: [],
      alertsTriggered: [],
    };
  }

  const latestPoint = validPoints[validPoints.length - 1];
  const previousPoint = validPoints.length > 1 ? validPoints[validPoints.length - 2] : null;

  const valorActual = latestPoint.valor!;
  const variacionPrevio = previousPoint && previousPoint.valor !== null
    ? Number((valorActual - previousPoint.valor).toFixed(4))
    : 0;

  // Cálculo histórico (media y desviación estándar)
  const sum = validPoints.reduce((acc, p) => acc + p.valor!, 0);
  const mean = sum / validPoints.length;
  const variance = validPoints.reduce((acc, p) => acc + Math.pow(p.valor! - mean, 2), 0) / validPoints.length;
  const stdDev = Math.sqrt(variance);

  const desviacionHistorica = Number((valorActual - mean).toFixed(4));
  const heterogeneidad = mean !== 0 ? Number((stdDev / Math.abs(mean)).toFixed(4)) : 0;

  const recomendaciones: Array<{ ruleId: string; titulo: string; severidad: string; recomendacion: string }> = [];
  const alertsTriggered: Array<{ ruleId: string; titulo: string; severidad: string; detalle: string }> = [];

  // Evaluar reglas configuradas
  const applicableRules = rulesConfig.rules.filter(
    (r) => r.enabled && r.vertical === vertical && r.variable === variable
  );

  for (const rule of applicableRules) {
    let triggered = false;

    if (rule.thresholdDelta !== undefined && variacionPrevio <= rule.thresholdDelta) {
      triggered = true;
    }
    if (rule.thresholdMax !== undefined && valorActual <= rule.thresholdMax) {
      triggered = true;
    }
    if (rule.thresholdMin !== undefined && valorActual >= rule.thresholdMin) {
      triggered = true;
    }

    if (triggered) {
      recomendaciones.push({
        ruleId: rule.ruleId,
        titulo: rule.title,
        severidad: rule.severity,
        recomendacion: rule.recommendation,
      });

      alertsTriggered.push({
        ruleId: rule.ruleId,
        titulo: rule.title,
        severidad: rule.severity,
        detalle: `${rule.diagnosis} (Generado por regla ${rule.ruleId})`,
      });
    }
  }

  return {
    status: "ok",
    valorActual,
    variacionPrevio,
    desviacionHistorica,
    heterogeneidad,
    nivelConfianza: "alta",
    diagnostico: recomendaciones.length > 0 ? recomendaciones[0].titulo : "Valor dentro del rango normal.",
    recomendaciones,
    alertsTriggered,
  };
}
