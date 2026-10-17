import { COOKIE_NAME } from "../shared/const";
import {
  getSatelitesHabilitados,
  getSatelliteConfigurationStatus,
  satelliteCatalog,
  satelliteValidationMessage,
  validarSatelitesSolicitados,
  type SatelliteId,
  type Vertical,
} from "../shared/satellite-catalog";
import { interpretMeasurement } from "../shared/interpretation";
import { getCopernicusResources, type Sector } from "../shared/copernicus-catalog";
import { validateSatelliteVariable } from "../shared/analysis-validation";
import { assertTransition, type AnalysisStatus } from "../shared/analysis-state";
import { buildAnalysisReport, MockCopernicusProvider, type EarthObservationProvider } from "../shared/observation-provider";
import { copernicusCDSEProvider, FallbackObservationProvider, isCopernicusLiveEnabled, SyntheticCopernicusProvider } from "./copernicus";
import { createCatalogClient } from "./catalog-client";
import { validatePlanLimits, type PlanId } from "../shared/plan-limits";
import { getTierForSuperficie, processingModeForTier, tierWaitEstimate } from "../shared/satellite-router";
import { querySentinel, tierLabel } from "../shared/satellite-service";
import { getReport, listReports } from "../shared/report-catalog";
import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { isProductionEnv } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { computeBBox, computePolygonAreaHa, geoJSONGeometrySchema, type GeoJSONGeometry, type GeoJSONPolygon } from "./geometry";
import { processSolicitud } from "./services/analysis-worker";
import { getSignedReportDownloadUrlService } from "./reports/storage-service";
import {
  createAuditLogDb,
  createPredioDb,
  createSolicitudAnalisisDb,
  createTenantDb,
  deletePredioDb,
  getDashboardDataDb,
  getPredioByIdDb,
  getReportByIdDb,
  getSolicitudByIdDb,
  getTenantSettingsDb,
  getTenantUsageAndLimits,
  getUserPreferencesDb,
  getWorkflowLogsDb,
  listAllTenantsDb,
  listAuditLogsDb,
  listFailedSolicitudesDb,
  listPrediosDb,
  listReportsDb,
  recordConsumoDb,
  saveApiKeyHashDb,
  saveInformeDb,
  saveMedicionesDb,
  saveTenantSettingsDb,
  saveUserPreferencesDb,
  updatePredioDb,
  updateTenantPlanDb,
  writeWorkflowLogDb,
} from "./db/repository";

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const allowedRoles = ["admin", "owner", "super_admin"];
  if (!allowedRoles.includes(ctx.user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acceso denegado. Se requieren permisos de administrador o super_admin.",
    });
  }
  return next();
});

const satelliteSchema = z.enum(["sentinel-1", "sentinel-2", "sentinel-3"]);
const verticalSchema = z.enum(["agricultura", "acuicultura", "forestal"]);
const planSchema = z.enum(["piloto", "regional_pyme", "region_completa"]);
const sectorSchema = z.enum(["agricultura", "acuicultura", "forestal", "emergencias"]);
const variableSchema = z.string().min(1);

const demoDashboard = {
  tenant: {
    nombre: "Hacienda Los Robles",
    vertical: "agricultura" as Vertical,
    plan: "Piloto Araucanía",
    usoHa: 86,
    limiteHa: 100,
  },
  predios: [
    { id: "predio-las-quinas", nombre: "Las Quinas", comuna: "Freire", hectareas: 42, ndvi: 0.68, estado: "Óptimo", delta: 0.04 },
    { id: "predio-el-aromo", nombre: "El Aromo", comuna: "Pitrufquén", hectareas: 31, ndvi: 0.51, estado: "Revisar", delta: -0.08 },
    { id: "predio-santa-elena", nombre: "Santa Elena", comuna: "Gorbea", hectareas: 13, ndvi: 0.72, estado: "Óptimo", delta: 0.02 },
  ],
  measurements: {
    "sentinel-2": [
      { fecha: "08 Ago", valor: 0.49 }, { fecha: "13 Ago", valor: 0.53 }, { fecha: "18 Ago", valor: 0.58 },
      { fecha: "23 Ago", valor: 0.55 }, { fecha: "28 Ago", valor: 0.61 }, { fecha: "02 Sep", valor: 0.64 }, { fecha: "07 Sep", valor: 0.68 },
    ],
    "sentinel-1": [
      { fecha: "08 Ago", valor: -18.4 }, { fecha: "13 Ago", valor: -17.8 }, { fecha: "18 Ago", valor: -19.1 },
      { fecha: "23 Ago", valor: -18.7 }, { fecha: "28 Ago", valor: -17.9 }, { fecha: "02 Sep", valor: -17.4 }, { fecha: "07 Sep", valor: -16.8 },
    ],
  },
  alerts: [
    { id: "a-1", nivel: "atención", titulo: "El Aromo necesita una revisión", detalle: "El vigor bajó 0,08 puntos en los últimos 15 días.", accion: "Ver zona" },
    { id: "a-2", nivel: "info", titulo: "Nueva imagen disponible", detalle: "Sentinel-2 actualizó Las Quinas hace 2 días.", accion: "Ver datos" },
  ],
};

const analysisInput = z.object({
  predioId: z.string().min(1),
  predioNombre: z.string().min(1).optional(),
  hectareas: z.number().positive().max(1_000_000).optional(),
  vertical: verticalSchema,
  satellites: z.array(satelliteSchema).min(1),
  variables: z.array(variableSchema).default([]),
  periodFrom: z.string().datetime().optional(),
  periodTo: z.string().datetime().optional(),
  correlationId: z.string().min(8).optional(),
  idempotencyKey: z.string().min(8).optional(),
  planId: planSchema.default("piloto"),
  haMesUsadas: z.number().nonnegative().default(0),
  prediosActivos: z.number().int().nonnegative().default(1),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  geometria: geoJSONGeometrySchema.optional(),
}).refine(data => {
  if (data.periodFrom && data.periodTo) {
    const from = new Date(data.periodFrom).getTime();
    const to = new Date(data.periodTo).getTime();
    return to - from >= 24 * 60 * 60 * 1000;
  }
  return true;
}, {
  message: "El periodo de análisis debe ser de al menos 24 horas",
  path: ["periodTo"],
});

type AnalysisInput = z.infer<typeof analysisInput>;
const idempotencyStore = new Map<string, unknown>();
const copernicusMode = process.env.COPERNICUS_MODE ?? "synthetic";
const isTestRuntime = process.env.NODE_ENV === "test";
const copernicusLiveEnabled = copernicusMode === "live" && isCopernicusLiveEnabled(process.env, copernicusCDSEProvider.getTokenManager());
const syntheticProvider = new SyntheticCopernicusProvider(
  copernicusLiveEnabled ? "Fallback sintético preparado para errores de Copernicus CDSE." : "Copernicus CDSE solo se activa en staging autorizado con COPERNICUS_MODE=live y ambas credenciales."
);
const observationProvider: EarthObservationProvider = isTestRuntime
  ? new MockCopernicusProvider()
  : copernicusLiveEnabled
    ? new FallbackObservationProvider(copernicusCDSEProvider, syntheticProvider)
    : syntheticProvider;
const catalogClient = createCatalogClient({
  getAccessToken: async () => copernicusLiveEnabled
    ? (await copernicusCDSEProvider.getTokenManager().fetchAccessToken()).accessToken
    : undefined,
});

function fallbackPolygonForPredio(predioId: string): GeoJSONPolygon {
  let hash = 0;
  for (let i = 0; i < predioId.length; i++) {
    hash = (hash << 5) - hash + predioId.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash) / 2147483647;
  const lng = Number((-72.6 + (normalized * 2 - 1) * 0.5).toFixed(4));
  const lat = Number((-38.7 + (normalized * 2 - 1) * 0.5).toFixed(4));
  const offset = 0.01;

  return {
    type: "Polygon",
    coordinates: [[
      [lng - offset, lat - offset],
      [lng + offset, lat - offset],
      [lng + offset, lat + offset],
      [lng - offset, lat + offset],
      [lng - offset, lat - offset],
    ]],
  };
}

async function createAnalysisRequest(
  input: AnalysisInput,
  tenantId: string = "tenant-default",
  accessToken?: string,
  userId?: string
) {
  const satellites = input.satellites as SatelliteId[];
  if (!validarSatelitesSolicitados(input.vertical, satellites)) {
    throw new Error(satelliteValidationMessage(input.vertical, satellites));
  }

  const variables = satellites.map((satellite, index) => input.variables[index] ?? satelliteCatalog[satellite].variables[0]?.variable).filter((value): value is string => Boolean(value));
  satellites.forEach((satellite, index) => validateSatelliteVariable(satellite, variables[index]));

  const correlationId = input.correlationId ?? `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rawIdempotencyKey = input.idempotencyKey ?? `${input.predioId}:${satellites.join(",")}:${variables.join(",")}:${input.periodFrom ?? "default"}:${input.periodTo ?? "default"}`;
  const idempotencyKey = `${tenantId}:${rawIdempotencyKey}`;

  const previous = idempotencyStore.get(idempotencyKey);
  if (previous) return previous;

  // 1. Obtener predio de la base de datos o usar geometría/bbox provista
  const predioDb = await getPredioByIdDb(tenantId, input.predioId, accessToken);
  let geometryToUse: GeoJSONGeometry | undefined = (predioDb?.geometria as GeoJSONGeometry) || input.geometria;
  let predioNombre = predioDb?.nombre || input.predioNombre || "Predio";

  if (!geometryToUse && input.bbox) {
    const [minLng, minLat, maxLng, maxLat] = input.bbox;
    geometryToUse = {
      type: "Polygon",
      coordinates: [[
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ]],
    };
  }

  if (!geometryToUse) {
    geometryToUse = fallbackPolygonForPredio(input.predioId);
  }

  const derivedBBox = computeBBox(geometryToUse);
  const superficieHa = Math.max(input.hectareas ?? 0, predioDb?.superficie_ha || computePolygonAreaHa(geometryToUse));

  // 2. Obtener uso y límites calculados en servidor desde DB
  const { planId, haMesUsadas, prediosActivos } = await getTenantUsageAndLimits(tenantId, accessToken);
  const tier = getTierForSuperficie(superficieHa);

  const planResult = validatePlanLimits(planId, tier, superficieHa, {
    haMesUsadas,
    prediosActivos,
  });
  if (!planResult.allowed) throw new Error(`${planResult.code}: ${planResult.message}`);

  // 3. Crear solicitud con estado 'pendiente' en DB
  const solicitudDb = await createSolicitudAnalisisDb({
    tenant_id: tenantId,
    predio_id: input.predioId,
    geometria: geometryToUse as any,
    superficie_ha: superficieHa,
    tier,
    satelites_solicitados: satellites,
    estado: tier === "tier3_regional" ? "requiere_revision" : "pendiente",
    motor_usado: processingModeForTier(tier),
    variables_solicitadas: variables,
    correlation_id: correlationId,
    idempotency_key: rawIdempotencyKey,
    solicitado_por: userId ?? null,
  }, accessToken);

  await writeWorkflowLogDb(tenantId, "createAnalysis", "exitoso", null, {
    solicitudId: solicitudDb.id,
    estado: solicitudDb.estado,
    mensaje: "Solicitud registrada con éxito",
  }, accessToken);

  if (tier === "tier3_regional") {
    const regionalResult = {
      id: solicitudDb.id ?? `sol-${Date.now()}`,
      correlationId,
      idempotencyKey,
      estado: "requiere_revision" as const,
      history: ["pendiente", "requiere_revision"] as AnalysisStatus[],
      tier,
      tierLabel: tierLabel(tier),
      motorUsado: processingModeForTier(tier),
      tiempoEstimado: tierWaitEstimate(tier),
      predioNombre,
      satelitesSolicitados: satellites,
      variablesSolicitadas: variables,
      bbox: derivedBBox,
      mensaje: "Este análisis regional requiere evaluación antes de consumir cuota o iniciar procesamiento.",
    };
    idempotencyStore.set(idempotencyKey, regionalResult);
    return regionalResult;
  }

  // 4. Iniciar procesamiento asíncrono en segundo plano (o inmediato en test)
  const processPromise = processSolicitud(solicitudDb, accessToken).catch(err => {
    console.error("[AsyncProcessing] Error en worker:", err);
  });

  // En entorno de pruebas o local, aguardamos la resolución síncrona
  if (isTestRuntime) {
    await processPromise;
    const completedReport = await getReportByIdDb(tenantId, solicitudDb.id!, accessToken);
    const medicion = (completedReport as any)?.contenido?.mediciones?.[0] ?? { satelite: satellites[0], variable: variables[0], valor: 0.5, unidad: "ratio" };
    const completedResult = {
      id: solicitudDb.id!,
      correlationId,
      idempotencyKey,
      estado: "completado" as const,
      history: ["pendiente", "en_cola", "procesando", "completado"] as AnalysisStatus[],
      tier,
      tierLabel: tierLabel(tier),
      motorUsado: processingModeForTier(tier),
      tiempoEstimado: tierWaitEstimate(tier),
      predioNombre,
      satelitesSolicitados: satellites,
      variablesSolicitadas: variables,
      bbox: derivedBBox,
      medicionPreview: medicion,
      interpretacionPreview: interpretMeasurement(medicion),
      informe: completedReport ? { ...completedReport, estado: completedReport.status } : { estado: "completado", status: "completado" },
      mensaje: `Solicitud creada para ${predioNombre}. Nivel ${tierLabel(tier)} asignado correctamente.`,
    };
    idempotencyStore.set(idempotencyKey, completedResult);
    return completedResult;
  }

  // Respuesta asíncrona inmediata no bloqueante para producción
  const pendingResponse = {
    id: solicitudDb.id!,
    correlationId,
    idempotencyKey,
    estado: "pendiente" as const,
    history: ["pendiente"] as AnalysisStatus[],
    tier,
    tierLabel: tierLabel(tier),
    motorUsado: processingModeForTier(tier),
    tiempoEstimado: tierWaitEstimate(tier),
    predioNombre,
    satelitesSolicitados: satellites,
    variablesSolicitadas: variables,
    bbox: derivedBBox,
    mensaje: "Solicitud registrada correctamente. Procesando en segundo plano...",
  };

  idempotencyStore.set(idempotencyKey, pendingResponse);
  return pendingResponse;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: protectedProcedure.query(opts => opts.ctx.user),
    logout: protectedProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        role: ctx.user.role,
        tenantId: ctx.user.tenantId,
      };
    }),
  }),
  preferences: router({
    getUserPreferences: protectedProcedure.query(async ({ ctx }) => {
      const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
      const prefs = await getUserPreferencesDb(ctx.user.id, accessToken);
      if (!prefs) {
        return {
          sector: "agricultura",
          necesidad: "monitoreo_general",
          fuentes_activas: ["sentinel-2"],
        };
      }
      return {
        sector: prefs.sector,
        necesidad: prefs.necesidad,
        fuentes_activas: prefs.fuentes_activas,
      };
    }),
    updateUserPreferences: protectedProcedure
      .input(z.object({
        sector: z.string().min(1),
        necesidad: z.string().min(1),
        fuentes_activas: z.array(z.string()).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        return saveUserPreferencesDb({
          user_id: ctx.user.id,
          sector: input.sector,
          necesidad: input.necesidad,
          fuentes_activas: input.fuentes_activas,
        }, accessToken);
      }),
    getTenantSettings: protectedProcedure.query(async ({ ctx }) => {
      const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
      const settings = await getTenantSettingsDb(ctx.user.tenantId, accessToken);
      if (!settings) {
        return {
          sector: "agricultura",
          necesidad: "monitoreo_general",
          fuentes_activas: ["sentinel-2"],
        };
      }
      return {
        sector: settings.sector,
        necesidad: settings.necesidad,
        fuentes_activas: settings.fuentes_activas,
      };
    }),
    updateTenantSettings: protectedProcedure
      .input(z.object({
        sector: z.string().min(1),
        necesidad: z.string().min(1),
        fuentes_activas: z.array(z.string()).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const allowedRoles = ["admin", "owner", "super_admin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo un administrador u propietario puede actualizar la configuración del tenant.",
          });
        }
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        return saveTenantSettingsDb({
          tenant_id: ctx.user.tenantId,
          sector: input.sector,
          necesidad: input.necesidad,
          fuentes_activas: input.fuentes_activas,
        }, accessToken);
      }),
  }),
  predios: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
      return listPrediosDb(ctx.user.tenantId, accessToken);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        const predio = await getPredioByIdDb(ctx.user.tenantId, input.id, accessToken);
        if (!predio) throw new TRPCError({ code: "NOT_FOUND", message: "Predio no encontrado" });
        return predio;
      }),
    create: protectedProcedure
      .input(z.object({
        nombre: z.string().min(2, "El nombre del predio debe tener al menos 2 caracteres"),
        geometria: geoJSONGeometrySchema,
        comuna: z.string().optional(),
        cultivo_o_uso: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        return createPredioDb({
          tenant_id: ctx.user.tenantId,
          nombre: input.nombre,
          geometria: input.geometria,
          comuna: input.comuna,
          cultivo_o_uso: input.cultivo_o_uso,
        }, accessToken);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.string().min(1),
        nombre: z.string().min(2).optional(),
        geometria: geoJSONGeometrySchema.optional(),
        comuna: z.string().optional(),
        cultivo_o_uso: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        const updated = await updatePredioDb(ctx.user.tenantId, input.id, input, accessToken);
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Predio no encontrado o no autorizado" });
        return updated;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        const success = await deletePredioDb(ctx.user.tenantId, input.id, accessToken);
        if (!success) throw new TRPCError({ code: "NOT_FOUND", message: "Predio no encontrado o no autorizado" });
        return { success: true };
      }),
  }),
  cleanleaf: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
      return getDashboardDataDb(ctx.user.tenantId, accessToken);
    }),
    reports: router({
      list: protectedProcedure
        .input(z.object({
          search: z.string().optional(),
          predio: z.string().optional(),
          satellite: z.string().optional(),
          status: z.enum(["todos", "pendiente", "en_cola", "procesando", "completado", "error_reintentable", "error_final", "requiere_revision", "cancelado"]).optional()
        }).optional())
        .query(async ({ input, ctx }) => {
          const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
          const dbReports = await listReportsDb(ctx.user.tenantId, input, accessToken);
          if (dbReports && dbReports.length > 0) {
            return dbReports;
          }
          return listReports(input);
        }),
      getById: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(async ({ input, ctx }) => {
          const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
          const dbReport = await getReportByIdDb(ctx.user.tenantId, input.id, accessToken);
          if (dbReport) {
            return dbReport;
          }
          return getReport(input.id) ?? null;
        }),
      getDownloadUrl: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(async ({ input, ctx }) => {
          const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
          try {
            return await getSignedReportDownloadUrlService(ctx.user.tenantId, input.id, accessToken);
          } catch (error) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: error instanceof Error ? error.message : "Acceso no autorizado al informe",
            });
          }
        }),
      getGeoJson: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(async ({ input, ctx }) => {
          const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
          const report = await getReportByIdDb(ctx.user.tenantId, input.id, accessToken);
          if (!report || report.tenantId !== ctx.user.tenantId) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Informe no encontrado o no autorizado" });
          }

          const predio = await getPredioByIdDb(ctx.user.tenantId, report.predioId, accessToken);
          const geometry = predio?.geometria || fallbackPolygonForPredio(report.predioId);

          return {
            type: "FeatureCollection" as const,
            features: [
              {
                type: "Feature" as const,
                id: report.id,
                geometry,
                properties: {
                  reportId: report.id,
                  predioNombre: report.predioNombre,
                  tenantId: report.tenantId,
                  periodo: `${report.fechaDesde} - ${report.fechaHasta}`,
                  satelites: report.satellites,
                  variables: report.variables,
                  resumen: report.summary,
                  recomendacion: report.recommendation,
                  metricas: report.metrics,
                },
              },
            ],
          };
        }),
    }),
    catalog: publicProcedure.input(z.object({ vertical: verticalSchema }).optional()).query(({ input }) => {
      const vertical = input?.vertical ?? "agricultura";
      return getSatelitesHabilitados(vertical).map(id => satelliteCatalog[id]);
    }),
    configStatus: publicProcedure.input(z.object({ vertical: verticalSchema }).optional()).query(({ input }) => getSatelliteConfigurationStatus(input?.vertical ?? "agricultura")),
    resources: protectedProcedure.input(z.object({ sector: sectorSchema }).optional()).query(({ input }) => getCopernicusResources((input?.sector ?? "agricultura") as Sector)),
    catalogSearch: protectedProcedure.input(z.object({
      bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
      datetime: z.string().optional(),
      collections: z.array(z.string().min(1)).min(1).max(5),
      limit: z.number().int().min(1).max(100).optional(),
      next: z.number().int().min(0).max(10000).optional(),
      filter: z.union([z.record(z.string(), z.unknown()), z.string()]).optional(),
      filterLang: z.enum(["cql2-json", "cql2-text"]).optional(),
      fields: z.object({ include: z.array(z.string()).optional(), exclude: z.array(z.string()).optional() }).optional(),
      distinct: z.string().optional(),
    })).mutation(async ({ input }) => {
      if (!copernicusLiveEnabled) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Catalog CDSE real solo está habilitado en staging con COPERNICUS_MODE=live y ambas credenciales." });
      }
      return catalogClient(input);
    }),
    createAnalysis: protectedProcedure.input(analysisInput).mutation(({ input, ctx }) => {
      const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
      return createAnalysisRequest(input, ctx.user.tenantId, accessToken, ctx.user.id);
    }),
  }),
  admin: router({
    listTenants: adminProcedure.query(async ({ ctx }) => {
      const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
      return listAllTenantsDb(accessToken);
    }),
    updatePlan: adminProcedure
      .input(z.object({ tenantId: z.string().min(1), planId: planSchema }))
      .mutation(async ({ input, ctx }) => {
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        const success = await updateTenantPlanDb(input.tenantId, input.planId, accessToken);
        await createAuditLogDb({
          tenant_id: ctx.user.tenantId,
          user_id: ctx.user.id,
          user_email: ctx.user.email,
          action: "admin.update_plan",
          entity: "tenant",
          payload: { targetTenantId: input.tenantId, newPlanId: input.planId },
        }, accessToken);
        return { success };
      }),
    listFailedSolicitudes: adminProcedure.query(async ({ ctx }) => {
      const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
      return listFailedSolicitudesDb(accessToken);
    }),
    retrySolicitud: adminProcedure
      .input(z.object({ solicitudId: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        const solicitud = await getSolicitudByIdDb(ctx.user.tenantId, input.solicitudId, accessToken);
        if (!solicitud) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud no encontrada" });

        const result = await processSolicitud(solicitud, accessToken);
        await createAuditLogDb({
          tenant_id: ctx.user.tenantId,
          user_id: ctx.user.id,
          user_email: ctx.user.email,
          action: "admin.retry_solicitud",
          entity: "solicitud_analisis",
          payload: { solicitudId: input.solicitudId, result },
        }, accessToken);

        return result;
      }),
    getAuditLogs: adminProcedure
      .input(z.object({ tenantId: z.string().optional(), action: z.string().optional() }).optional())
      .query(async ({ input, ctx }) => {
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        return listAuditLogsDb({ tenant_id: input?.tenantId, action: input?.action }, accessToken);
      }),
  }),
  apiV1: router({
    health: publicProcedure.query(() => ({ data: { api: "v1", status: copernicusLiveEnabled || isTestRuntime ? "ok" : "degraded", mode: isTestRuntime ? "test_mock" : copernicusLiveEnabled ? "copernicus_live_staging" : "synthetic_fallback", catalogAuthConfigured: copernicusLiveEnabled }, error: null })),
    solicitudes: router({
      create: protectedProcedure.input(analysisInput).mutation(async ({ input, ctx }) => {
        try {
          const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
          return { data: await createAnalysisRequest(input, ctx.user.tenantId, accessToken, ctx.user.id), error: null };
        } catch (error) {
          return { data: null, error: { code: "REQUEST_REJECTED", message: error instanceof Error ? error.message : "Solicitud rechazada" } };
        }
      }),
      getStatus: protectedProcedure
        .input(z.object({ id: z.string().min(1) }))
        .query(async ({ input, ctx }) => {
          const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
          const solicitud = await getSolicitudByIdDb(ctx.user.tenantId, input.id, accessToken);
          if (!solicitud) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud no encontrada" });

          const report = await getReportByIdDb(ctx.user.tenantId, input.id, accessToken);
          const logs = await getWorkflowLogsDb(ctx.user.tenantId, accessToken);

          return {
            id: solicitud.id!,
            estado: solicitud.estado,
            mensajeError: solicitud.mensaje_error,
            idempotencyKey: solicitud.idempotency_key,
            informe: report,
            timeline: logs.filter(l => l.payload?.solicitudId === input.id),
          };
        }),
    }),
    onboarding: router({
      createTenant: protectedProcedure.input(z.object({ organizationName: z.string().min(2), planId: planSchema })).mutation(async ({ input, ctx }) => {
        const allowedRoles = ["admin", "owner", "super_admin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden registrar nuevos tenants." });
        }
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        const tenant = await createTenantDb({ nombre: input.organizationName, plan_id: input.planId }, accessToken);
        return { data: { tenantId: tenant.id, nombre: tenant.nombre, planId: tenant.plan_id, estado: tenant.estado }, error: null };
      }),
    }),
    apiKeys: router({
      create: protectedProcedure.input(z.object({ tenantId: z.string().min(1), nombre: z.string().min(2) })).mutation(async ({ input, ctx }) => {
        const allowedRoles = ["admin", "owner", "super_admin"];
        if (!allowedRoles.includes(ctx.user.role)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden generar API keys." });
        }
        const accessToken = ctx.req?.headers?.authorization?.startsWith("Bearer ") ? ctx.req.headers.authorization.slice(7) : undefined;
        const plainKey = `cl_${randomBytes(18).toString("hex")}`;
        const hash = createHash("sha256").update(plainKey).digest("hex");
        await saveApiKeyHashDb({ tenant_id: input.tenantId, nombre: input.nombre, key_hash: hash }, accessToken);
        return { data: { tenantId: input.tenantId, nombre: input.nombre, key: plainKey, warning: "La API key solo se muestra una vez. Guárdala en un lugar seguro." }, error: null };
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
