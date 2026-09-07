export type AnalysisStatus = "borrador" | "pendiente" | "en_cola" | "procesando" | "completado" | "error_reintentable" | "error_final" | "requiere_revision" | "cancelado";

const transitions: Record<AnalysisStatus, AnalysisStatus[]> = {
  borrador: ["pendiente", "cancelado"],
  pendiente: ["en_cola", "requiere_revision", "error_final", "cancelado"],
  en_cola: ["procesando", "error_reintentable", "cancelado"],
  procesando: ["completado", "error_reintentable", "error_final", "requiere_revision"],
  completado: [],
  error_reintentable: ["en_cola", "cancelado"],
  error_final: [],
  requiere_revision: ["pendiente", "cancelado"],
  cancelado: [],
};

export function canTransition(from: AnalysisStatus, to: AnalysisStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: AnalysisStatus, to: AnalysisStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`INVALID_STATE_TRANSITION: no se puede cambiar de ${from} a ${to}.`);
  }
}

export function statusLabel(status: AnalysisStatus): string {
  return {
    borrador: "Borrador",
    pendiente: "Solicitud recibida",
    en_cola: "En cola",
    procesando: "Procesando fuente satelital",
    completado: "Informe listo",
    error_reintentable: "Fallo temporal · reintentar",
    error_final: "Fallo definitivo · soporte",
    requiere_revision: "Requiere evaluación",
    cancelado: "Cancelado",
  }[status];
}
