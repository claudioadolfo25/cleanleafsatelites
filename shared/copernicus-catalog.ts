export type Sector = "agricultura" | "acuicultura" | "forestal" | "emergencias";
export type ResourcePhase = "mvp" | "fase_2";
export type CopernicusSourceId = "cdse-statistical" | "cmems" | "clms" | "cems" | "cds" | "cams";

export type CopernicusResource = {
  id: CopernicusSourceId;
  nombre: string;
  proveedor: "Copernicus";
  sectores: Sector[];
  necesidades: string[];
  variables: string[];
  descripcion: string;
  endpointOficial: string;
  phase: ResourcePhase;
  enabled: boolean;
};

export const copernicusResources: CopernicusResource[] = [
  {
    id: "cdse-statistical",
    nombre: "Copernicus Data Space · Statistical API",
    proveedor: "Copernicus",
    sectores: ["agricultura", "acuicultura", "forestal"],
    necesidades: ["vigor vegetal", "humedad", "temperatura superficial", "series temporales"],
    variables: ["NDVI", "NDWI", "NDMI", "σ⁰ VV/VH", "SST", "clorofila-a"],
    descripcion: "Fuente principal del MVP para consultas agregadas por polígono sin descargar imágenes completas.",
    endpointOficial: "https://dataspace.copernicus.eu/",
    phase: "mvp",
    enabled: true,
  },
  {
    id: "cmems",
    nombre: "Copernicus Marine Service",
    proveedor: "Copernicus",
    sectores: ["acuicultura"],
    necesidades: ["temperatura del mar", "marea roja", "corrientes", "nivel del mar"],
    variables: ["SST", "clorofila-a", "corrientes", "altura del mar"],
    descripcion: "Contexto marino para acuicultura; se habilita después de validar el caso de uso y la costa objetivo.",
    endpointOficial: "https://marine.copernicus.eu/",
    phase: "fase_2",
    enabled: false,
  },
  {
    id: "clms",
    nombre: "Copernicus Land Monitoring Service",
    proveedor: "Copernicus",
    sectores: ["agricultura", "forestal"],
    necesidades: ["uso de suelo", "cobertura vegetal", "contexto regional", "humedad de suelo"],
    variables: ["cobertura de suelo", "LAI", "FAPAR", "humedad"],
    descripcion: "Capa territorial para comparar uso de suelo y estado de vegetación a escala regional.",
    endpointOficial: "https://land.copernicus.eu/",
    phase: "fase_2",
    enabled: false,
  },
  {
    id: "cems",
    nombre: "Copernicus Emergency Management Service",
    proveedor: "Copernicus",
    sectores: ["emergencias", "agricultura", "forestal"],
    necesidades: ["inundación", "incendio", "sequía", "daño por desastre"],
    variables: ["área inundada", "riesgo de incendio", "severidad de sequía"],
    descripcion: "Alertas y cartografía de emergencia para una fase de respuesta y riesgo operacional.",
    endpointOficial: "https://emergency.copernicus.eu/",
    phase: "fase_2",
    enabled: false,
  },
  {
    id: "cds",
    nombre: "Copernicus Climate Data Store (ECMWF Weather Engine)",
    proveedor: "Copernicus",
    sectores: ["agricultura", "forestal", "acuicultura"],
    necesidades: ["pronóstico 15 días", "contexto climático", "evapotranspiración", "sequía histórica"],
    variables: ["temperatura", "precipitación_acumulada", "humedad_relativa", "evapotranspiracion_ET0", "radiacion"],
    descripcion: "Motor agroclimático de pronóstico a 15 días y contexto climático derivado de reanálisis ERA5 / ECMWF.",
    endpointOficial: "https://cds.climate.copernicus.eu/",
    phase: "mvp",
    enabled: true,
  },
  {
    id: "cams",
    nombre: "Copernicus Atmosphere Monitoring Service",
    proveedor: "Copernicus",
    sectores: ["agricultura", "acuicultura", "forestal", "emergencias"],
    necesidades: ["calidad del aire", "humo", "aerosoles", "radiación UV"],
    variables: ["NO₂", "O₃", "PM2.5", "aerosoles", "índice UV"],
    descripcion: "Contexto atmosférico para alertas ambientales y riesgo de humo; permanece desactivado en el MVP.",
    endpointOficial: "https://atmosphere.copernicus.eu/",
    phase: "fase_2",
    enabled: false,
  },
];

export function getCopernicusResources(sector: Sector, includeFuture = true): CopernicusResource[] {
  return copernicusResources.filter(resource => resource.sectores.includes(sector) && (includeFuture || resource.enabled));
}

export function getActiveCopernicusResources(sector: Sector): CopernicusResource[] {
  return getCopernicusResources(sector, false);
}
