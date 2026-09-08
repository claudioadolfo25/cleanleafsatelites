var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/satellite-catalog.ts
function getSatelitesHabilitados(vertical) {
  const raw = process.env[environmentKey[vertical]];
  if (!raw) return fallbackEnabled[vertical];
  const parsed = raw.split(",").map((value) => value.trim()).filter((value) => value in satelliteCatalog);
  const policy = policyEnabled[vertical];
  const narrowed = parsed.filter((satellite) => policy.includes(satellite));
  return narrowed.length > 0 ? narrowed : fallbackEnabled[vertical];
}
function getSatelliteConfigurationStatus(vertical) {
  const raw = process.env[environmentKey[vertical]];
  const effective = getSatelitesHabilitados(vertical);
  if (!raw) {
    return {
      vertical,
      configured: false,
      valid: true,
      effective,
      warnings: ["No hay configuraci\xF3n expl\xEDcita; se usa el cat\xE1logo seguro por defecto."]
    };
  }
  const requested = raw.split(",").map((value) => value.trim()).filter(Boolean);
  const warnings = [];
  const duplicates = requested.filter((item, index) => requested.indexOf(item) !== index);
  const unknown = requested.filter((item) => !(item in satelliteCatalog));
  const disallowed = requested.filter((item) => item in satelliteCatalog && !policyEnabled[vertical].includes(item));
  if (duplicates.length > 0) warnings.push(`Sat\xE9lites duplicados ignorados: ${duplicates.join(", ")}.`);
  if (unknown.length > 0) warnings.push(`Valores desconocidos ignorados: ${unknown.join(", ")}.`);
  if (disallowed.length > 0) warnings.push(`Sat\xE9lites fuera de pol\xEDtica para ${vertical} ignorados: ${disallowed.join(", ")}.`);
  if (effective.length === 0) warnings.push("La configuraci\xF3n no dej\xF3 fuentes utilizables; se aplic\xF3 el fallback seguro.");
  return {
    vertical,
    configured: true,
    valid: warnings.length === 0 && requested.length > 0,
    effective,
    warnings
  };
}
function validarSatelitesSolicitados(vertical, requested) {
  if (requested.length === 0) return false;
  const enabled = getSatelitesHabilitados(vertical);
  return requested.every((satellite) => enabled.includes(satellite));
}
function getVariablesPorSatelite(satellite) {
  return satelliteCatalog[satellite].variables;
}
function satelliteValidationMessage(vertical, requested) {
  const enabled = getSatelitesHabilitados(vertical);
  const unavailable = requested.find((satellite) => !enabled.includes(satellite));
  if (!unavailable) return "Selecci\xF3n v\xE1lida";
  return `${satelliteCatalog[unavailable].nombre} no est\xE1 habilitado para la vertical ${vertical} en este plan.`;
}
var satelliteCatalog, fallbackEnabled, policyEnabled, environmentKey;
var init_satellite_catalog = __esm({
  "shared/satellite-catalog.ts"() {
    "use strict";
    satelliteCatalog = {
      "sentinel-1": {
        id: "sentinel-1",
        nombre: "Sentinel-1",
        etiqueta: "Radar",
        descripcion: "Funciona con cualquier clima, de d\xEDa y de noche. Ideal para humedad de suelo y detectar inundaciones cuando hay nubes.",
        actualizacion: "Actualizaci\xF3n cada 6 d\xEDas",
        variables: [
          { variable: "sigma0_vv", unidad: "dB", rango: [-25, -5], descripcion: "Humedad de suelo" },
          { variable: "sigma0_vh", unidad: "dB", rango: [-25, -5], descripcion: "Estructura vegetal" },
          { variable: "cross_ratio", unidad: "ratio", rango: [0, 1], descripcion: "Biomasa" },
          { variable: "rvi", unidad: "ratio", rango: [0, 1], descripcion: "Vigor radar" }
        ]
      },
      "sentinel-2": {
        id: "sentinel-2",
        nombre: "Sentinel-2",
        etiqueta: "\xD3ptico",
        descripcion: "Im\xE1genes de alta resoluci\xF3n (10 m), ideal para monitorear salud de cultivos. No funciona bien con cielo nublado.",
        actualizacion: "Actualizaci\xF3n cada 5 d\xEDas",
        variables: [
          { variable: "ndvi", unidad: "ratio", rango: [0, 1], descripcion: "Vigor vegetativo" },
          { variable: "ndwi", unidad: "ratio", rango: [-1, 1], descripcion: "Estr\xE9s h\xEDdrico" },
          { variable: "ndmi", unidad: "ratio", rango: [-1, 1], descripcion: "Humedad de follaje" },
          { variable: "evi", unidad: "ratio", rango: [0, 1], descripcion: "Vigor en alta biomasa" },
          { variable: "savi", unidad: "ratio", rango: [0, 1], descripcion: "Vigor corregido por suelo" }
        ]
      },
      "sentinel-3": {
        id: "sentinel-3",
        nombre: "Sentinel-3",
        etiqueta: "T\xE9rmico / oce\xE1nico",
        descripcion: "Sensores de temperatura y color del agua. Ideal para detectar marea roja y monitorear sequ\xEDa regional. No sirve para predios chicos.",
        actualizacion: "Actualizaci\xF3n cada 1\u20132 d\xEDas",
        variables: [
          { variable: "sst", unidad: "\xB0C", rango: [0, 30], descripcion: "Temperatura superficial del mar" },
          { variable: "clorofila_a", unidad: "mg/m\xB3", rango: [0, 10], descripcion: "Clorofila-a" },
          { variable: "lst", unidad: "\xB0C", rango: [0, 60], descripcion: "Temperatura superficial terrestre" },
          { variable: "ndvi_regional", unidad: "ratio", rango: [0, 1], descripcion: "Contexto regional" }
        ]
      }
    };
    fallbackEnabled = {
      agricultura: ["sentinel-2", "sentinel-1"],
      acuicultura: ["sentinel-3", "sentinel-2"],
      forestal: ["sentinel-2", "sentinel-1"]
    };
    policyEnabled = {
      agricultura: ["sentinel-2", "sentinel-1"],
      acuicultura: ["sentinel-3", "sentinel-2"],
      forestal: ["sentinel-2", "sentinel-1"]
    };
    environmentKey = {
      agricultura: "CLEANLEAF_SATELITES_HABILITADOS_AGRICULTURA",
      acuicultura: "CLEANLEAF_SATELITES_HABILITADOS_ACUICULTURA",
      forestal: "CLEANLEAF_SATELITES_HABILITADOS_FORESTAL"
    };
  }
});

// shared/satellite-router.ts
function configuredLimit(key, fallback) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
function getTierLimits() {
  const tier1MaxHa = configuredLimit("CLEANLEAF_TIER1_MAX_HA", DEFAULT_TIER1_MAX_HA);
  const configuredTier2 = configuredLimit("CLEANLEAF_TIER2_MAX_HA", DEFAULT_TIER2_MAX_HA);
  return {
    tier1MaxHa,
    tier2MaxHa: Math.max(configuredTier2, tier1MaxHa + 0.01)
  };
}
function getTierForSuperficie(hectares) {
  if (!Number.isFinite(hectares) || hectares < 0.5) {
    throw new Error("La superficie debe ser un n\xFAmero v\xE1lido de al menos 0,5 ha.");
  }
  const { tier1MaxHa, tier2MaxHa } = getTierLimits();
  if (hectares <= tier1MaxHa) return "tier1_predio";
  if (hectares <= tier2MaxHa) return "tier2_extendido";
  return "tier3_regional";
}
function processingModeForTier(tier) {
  const modes = {
    tier1_predio: "processing_api",
    tier2_extendido: "statistical_api",
    tier3_regional: "batch_api"
  };
  return modes[tier];
}
function tierWaitEstimate(tier) {
  return {
    tier1_predio: "unos minutos",
    tier2_extendido: "10\u201330 minutos",
    tier3_regional: "varias horas"
  }[tier];
}
var DEFAULT_TIER1_MAX_HA, DEFAULT_TIER2_MAX_HA;
var init_satellite_router = __esm({
  "shared/satellite-router.ts"() {
    "use strict";
    DEFAULT_TIER1_MAX_HA = 50;
    DEFAULT_TIER2_MAX_HA = 5e3;
  }
});

// src/lib/copernicus.ts
var CopernicusProvider, copernicusProvider;
var init_copernicus = __esm({
  "src/lib/copernicus.ts"() {
    "use strict";
    init_satellite_catalog();
    CopernicusProvider = class {
      clientId;
      clientSecret;
      token;
      tokenExpiresAt;
      constructor(credentials) {
        this.clientId = credentials?.clientId || process.env.COPERNICUS_CLIENT_ID;
        this.clientSecret = credentials?.clientSecret || process.env.COPERNICUS_CLIENT_SECRET;
      }
      async getAccessToken() {
        if (!this.clientId || !this.clientSecret) {
          return null;
        }
        if (this.token && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
          return this.token;
        }
        try {
          const response = await fetch("https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: this.clientId,
              client_secret: this.clientSecret
            })
          });
          if (!response.ok) {
            return null;
          }
          const data = await response.json();
          this.token = data.access_token;
          this.tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1e3;
          return this.token;
        } catch {
          return null;
        }
      }
      async query(predioId, satellite, variable = "ndvi") {
        const token = await this.getAccessToken();
        if (token) {
          try {
            const statsResponse = await fetch("https://sh.dataspace.copernicus.eu/api/v1/statistics", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                input: { bounds: { geometry: { type: "Polygon", coordinates: [] } }, data: [{ type: satellite }] },
                aggregation: { timeInterval: { from: new Date(Date.now() - 30 * 24 * 3600 * 1e3).toISOString(), to: (/* @__PURE__ */ new Date()).toISOString() }, width: 512, height: 512 }
              })
            });
            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              const calculatedValue = statsData.data?.[0]?.outputs?.default?.bands?.B01?.stats?.mean;
              if (typeof calculatedValue === "number") {
                const definition2 = getVariablesPorSatelite(satellite).find((item) => item.variable === variable);
                return {
                  satelite: satellite,
                  variable,
                  valor: Number(calculatedValue.toFixed(2)),
                  unidad: definition2?.unidad ?? "ratio",
                  fecha_adquisicion: /* @__PURE__ */ new Date()
                };
              }
            }
          } catch {
          }
        }
        const definition = getVariablesPorSatelite(satellite).find((item) => item.variable === variable);
        if (!definition) {
          throw new Error(`${variable} no es una variable disponible en ${satelliteCatalog[satellite].nombre}`);
        }
        const seed = `${predioId}:${satellite}:${variable}`;
        const hash = Array.from(seed).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1e4, 0);
        const normalized = hash / 1e4;
        const [min, max] = definition.rango;
        const valor = Number((min + normalized * (max - min)).toFixed(2));
        return {
          satelite: satellite,
          variable,
          valor,
          unidad: definition.unidad,
          fecha_adquisicion: /* @__PURE__ */ new Date()
        };
      }
    };
    copernicusProvider = new CopernicusProvider();
  }
});

// shared/satellite-service.ts
var satellite_service_exports = {};
__export(satellite_service_exports, {
  querySentinel: () => querySentinel,
  querySentinel1: () => querySentinel1,
  querySentinel2: () => querySentinel2,
  querySentinel3: () => querySentinel3,
  resolveTier: () => resolveTier,
  tierLabel: () => tierLabel
});
function resolveTier(hectares) {
  return getTierForSuperficie(hectares);
}
function tierLabel(tier) {
  return {
    tier1_predio: "Predio",
    tier2_extendido: "Zona extendida",
    tier3_regional: "Regional"
  }[tier];
}
async function querySentinel1(predioId, variable = "sigma0_vv") {
  return copernicusProvider.query(predioId, "sentinel-1", variable);
}
async function querySentinel2(predioId, variable = "ndvi") {
  return copernicusProvider.query(predioId, "sentinel-2", variable);
}
async function querySentinel3(predioId, variable = "sst") {
  return copernicusProvider.query(predioId, "sentinel-3", variable);
}
function querySentinel(predioId, satellite, variable) {
  const defaultVariable = getVariablesPorSatelite(satellite)[0]?.variable;
  const selectedVariable = variable ?? defaultVariable;
  if (!selectedVariable) throw new Error("No hay variables configuradas para el sat\xE9lite solicitado");
  if (satellite === "sentinel-1") return querySentinel1(predioId, selectedVariable);
  if (satellite === "sentinel-2") return querySentinel2(predioId, selectedVariable);
  return querySentinel3(predioId, selectedVariable);
}
var init_satellite_service = __esm({
  "shared/satellite-service.ts"() {
    "use strict";
    init_satellite_catalog();
    init_satellite_router();
    init_copernicus();
  }
});

// api/index.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/routers.ts
init_satellite_catalog();

// shared/interpretation.ts
function interpretMeasurement(input) {
  const apiKey = process.env.DIFY_API_KEY;
  if (apiKey) {
  }
  if (input.satelite === "sentinel-2" && input.variable === "ndvi") {
    if (input.valor < 0.4) return "Tu cultivo muestra menor vigor; conviene revisar riego o fertilizaci\xF3n esta semana.";
    if (input.valor < 0.6) return "El vigor del cultivo est\xE1 en un nivel intermedio; mant\xE9n el monitoreo y revisa las zonas amarillas.";
    return "El cultivo muestra buen vigor vegetativo y una cobertura saludable.";
  }
  if (input.satelite === "sentinel-1" && input.variable === "sigma0_vv") {
    if (input.valor <= -18) return "El suelo muestra alta humedad; si hay encharcamientos, revisa drenaje antes de la pr\xF3xima lluvia.";
    return "La humedad del suelo est\xE1 en un rango moderado; contin\xFAa observando despu\xE9s de las lluvias.";
  }
  if (input.satelite === "sentinel-3" && input.variable === "sst") {
    return input.valor > 14 ? "La temperatura superficial del mar es elevada; combina esta lectura con clorofila para vigilar riesgo de marea roja." : "La temperatura superficial del mar est\xE1 en un rango moderado para esta lectura.";
  }
  return "La lectura est\xE1 disponible para seguimiento. Cleanleaf combinar\xE1 esta se\xF1al con el historial del predio.";
}

// shared/copernicus-catalog.ts
var copernicusResources = [
  {
    id: "cdse-statistical",
    nombre: "Copernicus Data Space \xB7 Statistical API",
    proveedor: "Copernicus",
    sectores: ["agricultura", "acuicultura", "forestal"],
    necesidades: ["vigor vegetal", "humedad", "temperatura superficial", "series temporales"],
    variables: ["NDVI", "NDWI", "NDMI", "\u03C3\u2070 VV/VH", "SST", "clorofila-a"],
    descripcion: "Fuente principal del MVP para consultas agregadas por pol\xEDgono sin descargar im\xE1genes completas.",
    endpointOficial: "https://dataspace.copernicus.eu/",
    phase: "mvp",
    enabled: true
  },
  {
    id: "cmems",
    nombre: "Copernicus Marine Service",
    proveedor: "Copernicus",
    sectores: ["acuicultura"],
    necesidades: ["temperatura del mar", "marea roja", "corrientes", "nivel del mar"],
    variables: ["SST", "clorofila-a", "corrientes", "altura del mar"],
    descripcion: "Contexto marino para acuicultura; se habilita despu\xE9s de validar el caso de uso y la costa objetivo.",
    endpointOficial: "https://marine.copernicus.eu/",
    phase: "fase_2",
    enabled: false
  },
  {
    id: "clms",
    nombre: "Copernicus Land Monitoring Service",
    proveedor: "Copernicus",
    sectores: ["agricultura", "forestal"],
    necesidades: ["uso de suelo", "cobertura vegetal", "contexto regional", "humedad de suelo"],
    variables: ["cobertura de suelo", "LAI", "FAPAR", "humedad"],
    descripcion: "Capa territorial para comparar uso de suelo y estado de vegetaci\xF3n a escala regional.",
    endpointOficial: "https://land.copernicus.eu/",
    phase: "fase_2",
    enabled: false
  },
  {
    id: "cems",
    nombre: "Copernicus Emergency Management Service",
    proveedor: "Copernicus",
    sectores: ["emergencias", "agricultura", "forestal"],
    necesidades: ["inundaci\xF3n", "incendio", "sequ\xEDa", "da\xF1o por desastre"],
    variables: ["\xE1rea inundada", "riesgo de incendio", "severidad de sequ\xEDa"],
    descripcion: "Alertas y cartograf\xEDa de emergencia para una fase de respuesta y riesgo operacional.",
    endpointOficial: "https://emergency.copernicus.eu/",
    phase: "fase_2",
    enabled: false
  },
  {
    id: "cds",
    nombre: "Copernicus Climate Data Store",
    proveedor: "Copernicus",
    sectores: ["agricultura", "forestal"],
    necesidades: ["contexto clim\xE1tico", "sequ\xEDa hist\xF3rica", "proyecci\xF3n clim\xE1tica"],
    variables: ["temperatura", "precipitaci\xF3n", "humedad", "viento", "radiaci\xF3n"],
    descripcion: "Contexto clim\xE1tico hist\xF3rico y de proyecci\xF3n; no reemplaza la lectura satelital del predio.",
    endpointOficial: "https://cds.climate.copernicus.eu/",
    phase: "fase_2",
    enabled: false
  },
  {
    id: "cams",
    nombre: "Copernicus Atmosphere Monitoring Service",
    proveedor: "Copernicus",
    sectores: ["agricultura", "acuicultura", "forestal", "emergencias"],
    necesidades: ["calidad del aire", "humo", "aerosoles", "radiaci\xF3n UV"],
    variables: ["NO\u2082", "O\u2083", "PM2.5", "aerosoles", "\xEDndice UV"],
    descripcion: "Contexto atmosf\xE9rico para alertas ambientales y riesgo de humo; permanece desactivado en el MVP.",
    endpointOficial: "https://atmosphere.copernicus.eu/",
    phase: "fase_2",
    enabled: false
  }
];
function getCopernicusResources(sector, includeFuture = true) {
  return copernicusResources.filter((resource) => resource.sectores.includes(sector) && (includeFuture || resource.enabled));
}

// shared/analysis-validation.ts
init_satellite_catalog();
function validateSatelliteVariable(satellite, variable) {
  const available = getVariablesPorSatelite(satellite);
  if (!available.some((item) => item.variable === variable)) {
    throw new Error(`INVALID_SATELLITE_VARIABLE: La variable ${variable} no est\xE1 disponible para ${satelliteCatalog[satellite].nombre}.`);
  }
}

// shared/analysis-state.ts
var transitions = {
  borrador: ["pendiente", "cancelado"],
  pendiente: ["en_cola", "requiere_revision", "error_final", "cancelado"],
  en_cola: ["procesando", "error_reintentable", "cancelado"],
  procesando: ["completado", "error_reintentable", "error_final", "requiere_revision"],
  completado: [],
  error_reintentable: ["en_cola", "cancelado"],
  error_final: [],
  requiere_revision: ["pendiente", "cancelado"],
  cancelado: []
};
function canTransition(from, to) {
  return transitions[from].includes(to);
}
function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(`INVALID_STATE_TRANSITION: no se puede cambiar de ${from} a ${to}.`);
  }
}

// shared/observation-provider.ts
var MockCopernicusProvider = class {
  async query(request) {
    const { querySentinel: querySentinel5 } = await Promise.resolve().then(() => (init_satellite_service(), satellite_service_exports));
    return querySentinel5(request.predioId, request.satellite, request.variable);
  }
};
function buildAnalysisReport(input) {
  const { measurement } = input;
  const periodFrom = input.periodFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString();
  const periodTo = input.periodTo ?? (/* @__PURE__ */ new Date()).toISOString();
  const interpretation = interpretMeasurement(measurement);
  return {
    id: `report-${input.id}`,
    estado: "completado",
    predioId: input.predioId,
    predioNombre: input.predioNombre,
    tier: input.tier,
    periodo: { desde: periodFrom, hasta: periodTo },
    fuentes: [{ satelite: measurement.satelite, variable: measurement.variable, unidad: measurement.unidad }],
    resumen: interpretation,
    hallazgos: [{ tipo: "lectura_actual", severidad: measurement.valor < 0.3 && measurement.variable === "ndvi" ? "alta" : "baja", fuente: measurement.satelite, variable: measurement.variable, valor_actual: measurement.valor }],
    recomendaciones: ["Comparar este resultado con observaciones de terreno y la lectura anterior."],
    limitaciones: ["Resultado generado por proveedor mock hasta conectar Copernicus CDSE en staging."],
    mediciones: [measurement],
    generado_en: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// shared/plan-limits.ts
var planCatalog = {
  piloto: { id: "piloto", nombre: "Piloto", maxPredios: 5, maxHaMes: 50, permiteTier3Regional: false },
  regional_pyme: { id: "regional_pyme", nombre: "Regional PyME", maxPredios: 50, maxHaMes: 5e3, permiteTier3Regional: false },
  region_completa: { id: "region_completa", nombre: "Regi\xF3n completa", maxPredios: 1e3, maxHaMes: Number.POSITIVE_INFINITY, permiteTier3Regional: true }
};
function validatePlanLimits(planId, tier, hectares, usage) {
  const plan = planCatalog[planId];
  if (!plan) return { allowed: false, code: "PLAN_NOT_FOUND", message: "El plan solicitado no existe." };
  if (tier === "tier3_regional" && !plan.permiteTier3Regional) {
    return { allowed: false, code: "TIER3_NOT_ALLOWED", message: `El plan ${plan.nombre} no permite an\xE1lisis regionales.` };
  }
  if (usage.haMesUsadas + hectares > plan.maxHaMes) {
    return { allowed: false, code: "MONTHLY_HA_LIMIT", message: `El plan ${plan.nombre} supera su l\xEDmite mensual de hect\xE1reas analizables.` };
  }
  if (usage.prediosActivos > plan.maxPredios) {
    return { allowed: false, code: "PREDIO_LIMIT", message: `El plan ${plan.nombre} supera su l\xEDmite de predios.` };
  }
  return { allowed: true, plan };
}

// server/routers.ts
init_satellite_router();
init_satellite_service();

// shared/report-catalog.ts
var baseTrace = (id, status, progress, currentStep, actor, message) => [
  { at: "2026-09-07T14:18:00Z", actor: "usuario", status: "pendiente", message: "Solicitud creada", detail: `Informe ${id} validado y recibido.` },
  { at: "2026-09-07T14:18:08Z", actor: "workflow", status: "en_cola", message: "Procesamiento aceptado", detail: "La solicitud pas\xF3 las validaciones de fuente, variable, tier y plan." },
  { at: "2026-09-07T14:19:22Z", actor: "workflow", status: "procesando", message: "Consultando fuente satelital", detail: "Se est\xE1 preparando la medici\xF3n normalizada." },
  ...status === "completado" ? [{ at: "2026-09-07T14:24:51Z", actor: "workflow", status: "completado", message: "Informe disponible", detail: "Medici\xF3n, interpretaci\xF3n y recomendaci\xF3n verificadas." }] : [{ at: "2026-09-07T14:20:00Z", actor, status, message, detail: currentStep }]
];
var demoReports = [
  { id: "inf-el-aromo-ndvi", tenantId: "tenant-demo", predioId: "predio-el-aromo", predioNombre: "El Aromo", fechaDesde: "2026-08-01", fechaHasta: "2026-08-31", generatedAt: "2026-09-07T14:30:00Z", satellites: ["sentinel-2"], variables: ["NDVI", "NDMI"], status: "completado", progress: 100, currentStep: "Informe listo", alertLevel: "atencion", summary: "El vigor vegetativo disminuy\xF3 de forma moderada en el sector sur del predio.", recommendation: "Revisar el sistema de riego y repetir la lectura en 7 d\xEDas.", trace: baseTrace("inf-el-aromo-ndvi", "completado", 100, "Informe listo", "workflow", "Informe disponible"), metrics: [{ label: "NDVI promedio", value: "0,51", comparison: "\u221212% vs. julio" }, { label: "NDMI", value: "0,28", comparison: "bajo umbral 0,30" }, { label: "Zona afectada", value: "Sur", comparison: "28% bajo el promedio" }] },
  { id: "inf-las-quinas-radar", tenantId: "tenant-demo", predioId: "predio-las-quinas", predioNombre: "Las Quinas", fechaDesde: "2026-08-24", fechaHasta: "2026-09-05", generatedAt: "2026-09-05T11:15:00Z", satellites: ["sentinel-1"], variables: ["\u03C3\u2070 VV", "\u03C3\u2070 VH"], status: "completado", progress: 100, currentStep: "Informe listo", alertLevel: "normal", summary: "La se\xF1al radar se mantiene estable y no muestra cambios relevantes en humedad superficial.", recommendation: "Mantener el monitoreo semanal y comparar despu\xE9s del pr\xF3ximo riego.", trace: baseTrace("inf-las-quinas-radar", "completado", 100, "Informe listo", "workflow", "Informe disponible"), metrics: [{ label: "\u03C3\u2070 VV", value: "\u221216,8 dB", comparison: "+1,2 dB vs. anterior" }, { label: "\u03C3\u2070 VH", value: "\u221222,1 dB", comparison: "sin cambio material" }, { label: "Calidad", value: "Buena", comparison: "baja nubosidad" }] },
  { id: "inf-santa-elena-ndvi", tenantId: "tenant-demo", predioId: "predio-santa-elena", predioNombre: "Santa Elena", fechaDesde: "2026-08-25", fechaHasta: "2026-09-07", generatedAt: "2026-09-07T15:02:00Z", satellites: ["sentinel-2"], variables: ["NDVI", "EVI"], status: "procesando", progress: 68, currentStep: "Validando mediciones y generando interpretaci\xF3n", alertLevel: "normal", summary: "La medici\xF3n est\xE1 siendo procesada; todav\xEDa no hay una conclusi\xF3n final.", recommendation: "El informe estar\xE1 disponible cuando finalice la validaci\xF3n.", trace: baseTrace("inf-santa-elena-ndvi", "procesando", 68, "Validando mediciones y generando interpretaci\xF3n", "workflow", "Procesamiento en curso"), metrics: [{ label: "Progreso", value: "68%", comparison: "2 de 3 fuentes validadas" }, { label: "\xDAltima actividad", value: "Hace 2 min", comparison: "workflow activo" }] },
  { id: "inf-el-aromo-error", tenantId: "tenant-demo", predioId: "predio-el-aromo", predioNombre: "El Aromo", fechaDesde: "2026-08-18", fechaHasta: "2026-08-24", generatedAt: "2026-08-25T09:12:00Z", satellites: ["sentinel-2"], variables: ["NDVI"], status: "error_reintentable", progress: 42, currentStep: "No se encontr\xF3 una escena \xF3ptica utilizable", alertLevel: "critica", summary: "La fuente \xF3ptica no tuvo una escena con calidad suficiente para este periodo.", recommendation: "Reintentar con Sentinel-1 o ampliar la ventana de fechas.", trace: baseTrace("inf-el-aromo-error", "error_reintentable", 42, "No se encontr\xF3 una escena \xF3ptica utilizable", "copernicus", "Fallo temporal"), metrics: [{ label: "Progreso", value: "42%", comparison: "detenido por calidad" }, { label: "Reintento", value: "Disponible", comparison: "sin consumo duplicado" }] },
  { id: "inf-regional-review", tenantId: "tenant-demo", predioId: "region-araucania", predioNombre: "Regi\xF3n Araucan\xEDa", fechaDesde: "2026-08-01", fechaHasta: "2026-08-31", generatedAt: "2026-08-20T08:40:00Z", satellites: ["sentinel-2"], variables: ["NDVI regional"], status: "requiere_revision", progress: 12, currentStep: "Esperando evaluaci\xF3n del procesamiento regional", alertLevel: "atencion", summary: "El alcance regional supera el procesamiento autom\xE1tico disponible en el plan actual.", recommendation: "Solicitar evaluaci\xF3n antes de iniciar el procesamiento; no se consumi\xF3 cuota.", trace: [{ at: "2026-08-20T08:40:00Z", actor: "usuario", status: "pendiente", message: "Solicitud recibida", detail: "Se valid\xF3 el \xE1rea regional." }, { at: "2026-08-20T08:40:01Z", actor: "policy", status: "requiere_revision", message: "Revisi\xF3n necesaria", detail: "Tier regional requiere autorizaci\xF3n expl\xEDcita." }], metrics: [{ label: "\xC1rea", value: ">5.000 ha", comparison: "tier regional" }, { label: "Consumo", value: "0 ha", comparison: "bloqueado de forma segura" }] }
];
function listReports(filters = {}) {
  return demoReports.filter((report) => (!filters.search || `${report.predioNombre} ${report.variables.join(" ")}`.toLowerCase().includes(filters.search.toLowerCase())) && (!filters.predio || report.predioNombre === filters.predio) && (!filters.satellite || report.satellites.includes(filters.satellite)) && (!filters.status || filters.status === "todos" || report.status === filters.status));
}
function getReport(id) {
  return demoReports.find((report) => report.id === id);
}

// server/routers.ts
import { createHash, randomBytes } from "node:crypto";
import { z as z2 } from "zod";

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/_core/notification.ts
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var satelliteSchema = z2.enum(["sentinel-1", "sentinel-2", "sentinel-3"]);
var verticalSchema = z2.enum(["agricultura", "acuicultura", "forestal"]);
var planSchema = z2.enum(["piloto", "regional_pyme", "region_completa"]);
var sectorSchema = z2.enum(["agricultura", "acuicultura", "forestal", "emergencias"]);
var variableSchema = z2.string().min(1);
var demoDashboard = {
  tenant: {
    nombre: "Hacienda Los Robles",
    vertical: "agricultura",
    plan: "Piloto Araucan\xEDa",
    usoHa: 86,
    limiteHa: 100
  },
  predios: [
    { id: "predio-las-quinas", nombre: "Las Quinas", comuna: "Freire", hectareas: 42, ndvi: 0.68, estado: "\xD3ptimo", delta: 0.04 },
    { id: "predio-el-aromo", nombre: "El Aromo", comuna: "Pitrufqu\xE9n", hectareas: 31, ndvi: 0.51, estado: "Revisar", delta: -0.08 },
    { id: "predio-santa-elena", nombre: "Santa Elena", comuna: "Gorbea", hectareas: 13, ndvi: 0.72, estado: "\xD3ptimo", delta: 0.02 }
  ],
  measurements: {
    "sentinel-2": [
      { fecha: "08 Ago", valor: 0.49 },
      { fecha: "13 Ago", valor: 0.53 },
      { fecha: "18 Ago", valor: 0.58 },
      { fecha: "23 Ago", valor: 0.55 },
      { fecha: "28 Ago", valor: 0.61 },
      { fecha: "02 Sep", valor: 0.64 },
      { fecha: "07 Sep", valor: 0.68 }
    ],
    "sentinel-1": [
      { fecha: "08 Ago", valor: -18.4 },
      { fecha: "13 Ago", valor: -17.8 },
      { fecha: "18 Ago", valor: -19.1 },
      { fecha: "23 Ago", valor: -18.7 },
      { fecha: "28 Ago", valor: -17.9 },
      { fecha: "02 Sep", valor: -17.4 },
      { fecha: "07 Sep", valor: -16.8 }
    ]
  },
  alerts: [
    { id: "a-1", nivel: "atenci\xF3n", titulo: "El Aromo necesita una revisi\xF3n", detalle: "El vigor baj\xF3 0,08 puntos en los \xFAltimos 15 d\xEDas.", accion: "Ver zona" },
    { id: "a-2", nivel: "info", titulo: "Nueva imagen disponible", detalle: "Sentinel-2 actualiz\xF3 Las Quinas hace 2 d\xEDas.", accion: "Ver datos" }
  ]
};
var analysisInput = z2.object({
  predioId: z2.string().min(1),
  predioNombre: z2.string().min(1),
  hectareas: z2.number().positive().max(1e6),
  vertical: verticalSchema,
  satellites: z2.array(satelliteSchema).min(1),
  variables: z2.array(variableSchema).default([]),
  periodFrom: z2.string().datetime().optional(),
  periodTo: z2.string().datetime().optional(),
  correlationId: z2.string().min(8).optional(),
  idempotencyKey: z2.string().min(8).optional(),
  planId: planSchema.default("piloto"),
  haMesUsadas: z2.number().nonnegative().default(0),
  prediosActivos: z2.number().int().nonnegative().default(1)
});
var idempotencyStore = /* @__PURE__ */ new Map();
var observationProvider = new MockCopernicusProvider();
async function createAnalysisRequest(input) {
  const satellites = input.satellites;
  if (!validarSatelitesSolicitados(input.vertical, satellites)) {
    throw new Error(satelliteValidationMessage(input.vertical, satellites));
  }
  const variables = satellites.map((satellite, index) => input.variables[index] ?? satelliteCatalog[satellite].variables[0]?.variable).filter((value) => Boolean(value));
  satellites.forEach((satellite, index) => validateSatelliteVariable(satellite, variables[index]));
  const correlationId = input.correlationId ?? `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idempotencyKey = input.idempotencyKey ?? `${input.predioId}:${satellites.join(",")}:${variables.join(",")}:${input.periodFrom ?? "default"}:${input.periodTo ?? "default"}`;
  const previous = idempotencyStore.get(idempotencyKey);
  if (previous) return previous;
  const tier = getTierForSuperficie(input.hectareas);
  const planResult = validatePlanLimits(input.planId, tier, input.hectareas, {
    haMesUsadas: input.haMesUsadas,
    prediosActivos: input.prediosActivos
  });
  if (!planResult.allowed) throw new Error(`${planResult.code}: ${planResult.message}`);
  const id = `sol-${Date.now()}`;
  if (tier === "tier3_regional") {
    const regionalResult = {
      id,
      correlationId,
      idempotencyKey,
      estado: "requiere_revision",
      history: ["pendiente", "requiere_revision"],
      tier,
      tierLabel: tierLabel(tier),
      motorUsado: processingModeForTier(tier),
      tiempoEstimado: tierWaitEstimate(tier),
      predioNombre: input.predioNombre,
      satelitesSolicitados: satellites,
      variablesSolicitadas: variables,
      mensaje: "Este an\xE1lisis regional requiere evaluaci\xF3n antes de consumir cuota o iniciar procesamiento."
    };
    idempotencyStore.set(idempotencyKey, regionalResult);
    return regionalResult;
  }
  const firstSatellite = satellites[0];
  const firstVariable = variables[0];
  const history = ["pendiente", "en_cola", "procesando"];
  assertTransition(history[0], history[1]);
  assertTransition(history[1], history[2]);
  const result = await observationProvider.query({ predioId: input.predioId, satellite: firstSatellite, variable: firstVariable, tier, periodFrom: input.periodFrom, periodTo: input.periodTo });
  const report = buildAnalysisReport({ id, predioId: input.predioId, predioNombre: input.predioNombre, tier, measurement: result, periodFrom: input.periodFrom, periodTo: input.periodTo });
  history.push("completado");
  assertTransition(history[2], history[3]);
  const completedResult = {
    id,
    correlationId,
    idempotencyKey,
    estado: "completado",
    history,
    tier,
    tierLabel: tierLabel(tier),
    motorUsado: processingModeForTier(tier),
    tiempoEstimado: tierWaitEstimate(tier),
    predioNombre: input.predioNombre,
    satelitesSolicitados: satellites,
    variablesSolicitadas: variables,
    medicionPreview: result,
    interpretacionPreview: interpretMeasurement(result),
    informe: report,
    mensaje: `Solicitud creada para ${input.predioNombre}. Nivel ${tierLabel(tier)} asignado correctamente.`
  };
  idempotencyStore.set(idempotencyKey, completedResult);
  return completedResult;
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  cleanleaf: router({
    dashboard: publicProcedure.query(() => demoDashboard),
    reports: router({
      list: publicProcedure.input(z2.object({ search: z2.string().optional(), predio: z2.string().optional(), satellite: z2.string().optional(), status: z2.enum(["todos", "pendiente", "en_cola", "procesando", "completado", "error_reintentable", "error_final", "requiere_revision", "cancelado"]).optional() }).optional()).query(({ input }) => listReports(input)),
      getById: publicProcedure.input(z2.object({ id: z2.string().min(1) })).query(({ input }) => getReport(input.id) ?? null)
    }),
    catalog: publicProcedure.input(z2.object({ vertical: verticalSchema }).optional()).query(({ input }) => {
      const vertical = input?.vertical ?? "agricultura";
      return getSatelitesHabilitados(vertical).map((id) => satelliteCatalog[id]);
    }),
    configStatus: publicProcedure.input(z2.object({ vertical: verticalSchema }).optional()).query(({ input }) => getSatelliteConfigurationStatus(input?.vertical ?? "agricultura")),
    resources: publicProcedure.input(z2.object({ sector: sectorSchema }).optional()).query(({ input }) => getCopernicusResources(input?.sector ?? "agricultura")),
    createAnalysis: publicProcedure.input(analysisInput).mutation(({ input }) => createAnalysisRequest(input))
  }),
  apiV1: router({
    health: publicProcedure.query(() => ({ data: { api: "v1", status: "ok", mode: "stub" }, error: null })),
    solicitudes: router({
      create: publicProcedure.input(analysisInput).mutation(async ({ input }) => {
        try {
          return { data: await createAnalysisRequest(input), error: null };
        } catch (error) {
          return { data: null, error: { code: "REQUEST_REJECTED", message: error instanceof Error ? error.message : "Solicitud rechazada" } };
        }
      })
    }),
    onboarding: router({
      createTenant: publicProcedure.input(z2.object({ organizationName: z2.string().min(2), planId: planSchema })).mutation(({ input }) => ({
        data: { tenantId: `tenant-${Date.now()}`, nombre: input.organizationName, planId: input.planId, estado: "trial" },
        error: null
      }))
    }),
    apiKeys: router({
      create: publicProcedure.input(z2.object({ tenantId: z2.string().min(1), nombre: z2.string().min(2) })).mutation(({ input }) => {
        const plainKey = `cl_${randomBytes(18).toString("hex")}`;
        const hash = createHash("sha256").update(plainKey).digest("hex");
        return { data: { tenantId: input.tenantId, nombre: input.nombre, key: plainKey, hash, warning: "La key se muestra una sola vez en este stub." }, error: null };
      })
    })
  })
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}

// server/_core/sdk.ts
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// api/index.ts
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
var trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
  onError: ({ error, path }) => {
    console.error(`[tRPC Error] path=${path}:`, error);
  }
});
app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);
var healthHandler = (_req, res) => {
  res.json({ status: "ok", mode: "vercel-serverless" });
};
app.get("/api/health", healthHandler);
app.get("/health", healthHandler);
var index_default = app;
export {
  index_default as default
};
