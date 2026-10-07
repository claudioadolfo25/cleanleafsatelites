export type Vertical = "agricultura" | "acuicultura" | "forestal";
export type SatelliteId = "sentinel-1" | "sentinel-2" | "sentinel-3";

export type SatelliteVariable = {
  variable: string;
  unidad: string;
  rango: [number, number];
  descripcion: string;
};

export type SatelliteDefinition = {
  id: SatelliteId;
  nombre: string;
  etiqueta: string;
  descripcion: string;
  actualizacion: string;
  variables: SatelliteVariable[];
};

export const satelliteCatalog: Record<SatelliteId, SatelliteDefinition> = {
  "sentinel-1": {
    id: "sentinel-1",
    nombre: "Sentinel-1",
    etiqueta: "Radar",
    descripcion:
      "Funciona con cualquier clima, de día y de noche. Ideal para humedad de suelo y detectar inundaciones cuando hay nubes.",
    actualizacion: "Actualización cada 6 días",
    variables: [
      { variable: "sigma0_vv", unidad: "dB", rango: [-25, -5], descripcion: "Humedad de suelo" },
      { variable: "sigma0_vh", unidad: "dB", rango: [-25, -5], descripcion: "Estructura vegetal" },
      { variable: "cross_ratio", unidad: "ratio", rango: [0, 1], descripcion: "Biomasa" },
      { variable: "rvi", unidad: "ratio", rango: [0, 1], descripcion: "Vigor radar" },
    ],
  },
  "sentinel-2": {
    id: "sentinel-2",
    nombre: "Sentinel-2",
    etiqueta: "Óptico",
    descripcion:
      "Imágenes de alta resolución (10 m), ideal para monitorear salud de cultivos. No funciona bien con cielo nublado.",
    actualizacion: "Actualización cada 5 días",
    variables: [
      { variable: "ndvi", unidad: "ratio", rango: [0, 1], descripcion: "Vigor vegetativo" },
      { variable: "ndwi", unidad: "ratio", rango: [-1, 1], descripcion: "Estrés hídrico" },
      { variable: "ndmi", unidad: "ratio", rango: [-1, 1], descripcion: "Humedad de follaje" },
      { variable: "evi", unidad: "ratio", rango: [0, 1], descripcion: "Vigor en alta biomasa" },
      { variable: "savi", unidad: "ratio", rango: [0, 1], descripcion: "Vigor corregido por suelo" },
      { variable: "ndre", unidad: "ratio", rango: [0, 1], descripcion: "Clorofila y nitrógeno foliado (Red-Edge B5/B8A)" },
      { variable: "soc_swir", unidad: "index", rango: [0, 100], descripcion: "Estimación de Materia Orgánica / Carbono del Suelo (SWIR B11/B12)" },
    ],
  },
  "sentinel-3": {
    id: "sentinel-3",
    nombre: "Sentinel-3",
    etiqueta: "Térmico / oceánico",
    descripcion:
      "Sensores de temperatura y color del agua. Ideal para detectar marea roja y monitorear sequía regional. No sirve para predios chicos.",
    actualizacion: "Actualización cada 1–2 días",
    variables: [
      { variable: "sst", unidad: "°C", rango: [0, 30], descripcion: "Temperatura superficial del mar" },
      { variable: "clorofila_a", unidad: "mg/m³", rango: [0, 10], descripcion: "Clorofila-a" },
      { variable: "lst", unidad: "°C", rango: [0, 60], descripcion: "Temperatura superficial terrestre" },
      { variable: "ndvi_regional", unidad: "ratio", rango: [0, 1], descripcion: "Contexto regional" },
    ],
  },
};

const fallbackEnabled: Record<Vertical, SatelliteId[]> = {
  agricultura: ["sentinel-2", "sentinel-1"],
  acuicultura: ["sentinel-3", "sentinel-2"],
  forestal: ["sentinel-2", "sentinel-1"],
};

// Product policy is stricter than environment configuration. An operator can
// narrow a catalog, but can never widen it beyond the approved vertical policy.
const policyEnabled: Record<Vertical, SatelliteId[]> = {
  agricultura: ["sentinel-2", "sentinel-1"],
  acuicultura: ["sentinel-3", "sentinel-2"],
  forestal: ["sentinel-2", "sentinel-1"],
};

const environmentKey: Record<Vertical, string> = {
  agricultura: "CLEANLEAF_SATELITES_HABILITADOS_AGRICULTURA",
  acuicultura: "CLEANLEAF_SATELITES_HABILITADOS_ACUICULTURA",
  forestal: "CLEANLEAF_SATELITES_HABILITADOS_FORESTAL",
};

export function getSatelitesHabilitados(vertical: Vertical): SatelliteId[] {
  const raw = process.env[environmentKey[vertical]];
  if (!raw) return fallbackEnabled[vertical];

  const parsed = raw
    .split(",")
    .map(value => value.trim())
    .filter((value): value is SatelliteId => value in satelliteCatalog);

  const policy = policyEnabled[vertical];
  const narrowed = parsed.filter(satellite => policy.includes(satellite));
  return narrowed.length > 0 ? narrowed : fallbackEnabled[vertical];
}

export type SatelliteConfigurationStatus = {
  vertical: Vertical;
  configured: boolean;
  valid: boolean;
  effective: SatelliteId[];
  warnings: string[];
};

export function getSatelliteConfigurationStatus(vertical: Vertical): SatelliteConfigurationStatus {
  const raw = process.env[environmentKey[vertical]];
  const effective = getSatelitesHabilitados(vertical);
  if (!raw) {
    return {
      vertical,
      configured: false,
      valid: true,
      effective,
      warnings: ["No hay configuración explícita; se usa el catálogo seguro por defecto."],
    };
  }

  const requested = raw.split(",").map(value => value.trim()).filter(Boolean);
  const warnings: string[] = [];
  const duplicates = requested.filter((item, index) => requested.indexOf(item) !== index);
  const unknown = requested.filter(item => !(item in satelliteCatalog));
  const disallowed = requested.filter(item => item in satelliteCatalog && !policyEnabled[vertical].includes(item as SatelliteId));
  if (duplicates.length > 0) warnings.push(`Satélites duplicados ignorados: ${duplicates.join(", ")}.`);
  if (unknown.length > 0) warnings.push(`Valores desconocidos ignorados: ${unknown.join(", ")}.`);
  if (disallowed.length > 0) warnings.push(`Satélites fuera de política para ${vertical} ignorados: ${disallowed.join(", ")}.`);
  if (effective.length === 0) warnings.push("La configuración no dejó fuentes utilizables; se aplicó el fallback seguro.");

  return {
    vertical,
    configured: true,
    valid: warnings.length === 0 && requested.length > 0,
    effective,
    warnings,
  };
}

export function validarSatelitesSolicitados(
  vertical: Vertical,
  requested: SatelliteId[],
): boolean {
  if (requested.length === 0) return false;
  const enabled = getSatelitesHabilitados(vertical);
  return requested.every(satellite => enabled.includes(satellite));
}

export function getVariablesPorSatelite(satellite: SatelliteId): SatelliteVariable[] {
  return satelliteCatalog[satellite].variables;
}

export function satelliteValidationMessage(vertical: Vertical, requested: SatelliteId[]): string {
  const enabled = getSatelitesHabilitados(vertical);
  const unavailable = requested.find(satellite => !enabled.includes(satellite));
  if (!unavailable) return "Selección válida";
  return `${satelliteCatalog[unavailable].nombre} no está habilitado para la vertical ${vertical} en este plan.`;
}
