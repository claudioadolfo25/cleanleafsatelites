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
import {
  createPredioDb,
  createSolicitudAnalisisDb,
  deletePredioDb,
  getDashboardDataDb,
  getPredioByIdDb,
  getReportByIdDb,
  getTenantUsageAndLimits,
  listPrediosDb,
  listReportsDb,
  recordConsumoDb,
  saveInformeDb,
  saveMedicionesDb,
  updatePredioDb,
  writeWorkflowLogDb,
} from "./db/repository";

const satelliteSchema = z.enum(["sentinel-1", "sentinel-2", "sentinel-3"]);
const verticalSchema = z.enum(["agricultura", "acuicultura", "forestal"]);
const planSchema = z.enum(["piloto", "regional_pyme", "region_completa"]);
const sectorSchema = z.enum(["agricultura", "acuicultura", "forestal", "emergencias"]);
const variableSchema = z.string().min(1);

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

  // 3. Persistir/recuperar la solicitud por idempotencia en DB
  const solicitudDb = await createSolicitudAnalisisDb({
    tenant_id: tenantId,
    predio_id: input.predioId,
    geometria: geometryToUse as any,
    superficie_ha: superficieHa,
    tier,
    satelites_solicitados: satellites,
    estado: tier === "tier3_regional" ? "requiere_revision" : "procesando",
    motor_usado: processingModeForTier(tier),
    variables_solicitadas: variables,
    correlation_id: correlationId,
    idempotency_key: rawIdempotencyKey,
    solicitado_por: userId ?? null,
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
    await writeWorkflowLogDb(tenantId, "createAnalysis", "exitoso", null, regionalResult, accessToken);
    return regionalResult;
  }

  // 4. Procesar medición usando el BBOX derivado de la geometría real
  const firstSatellite = satellites[0];
  const firstVariable = variables[0];
  const history: AnalysisStatus[] = ["pendiente", "en_cola", "procesando"];
  assertTransition(history[0], history[1]);
  assertTransition(history[1], history[2]);

  const result = await observationProvider.query({
    predioId: input.predioId,
    satellite: firstSatellite,
    variable: firstVariable,
    tier,
    periodFrom: input.periodFrom,
    periodTo: input.periodTo,
    bbox: derivedBBox
  });

  const report = buildAnalysisReport({ id: solicitudDb.id ?? `sol-${Date.now()}`, predioId: input.predioId, predioNombre, tier, measurement: result, periodFrom: input.periodFrom, periodTo: input.periodTo });
  history.push("completado");
  assertTransition(history[2], history[3]);

  // 5. Guardar Informe, Mediciones, Consumo y Logs en DB
  await saveInformeDb({
    tenant_id: tenantId,
    predio_id: input.predioId,
    solicitud_id: solicitudDb.id,
    tipo_lente: "agro",
    contenido: report as any,
  }, accessToken);

  const acquisitionDate = (result as any).fecha ?? (result as any).acquired_at;
  const acquisitionIsoStr = acquisitionDate instanceof Date ? acquisitionDate.toISOString() : typeof acquisitionDate === "string" ? acquisitionDate : new Date().toISOString();

  await saveMedicionesDb([{
    tenant_id: tenantId,
    predio_id: input.predioId,
    solicitud_id: solicitudDb.id,
    satelite: firstSatellite,
    variable: firstVariable,
    valor: result.valor,
    unidad: result.unidad,
    fecha_adquisicion: acquisitionIsoStr,
  }], accessToken);

  await recordConsumoDb(tenantId, superficieHa, accessToken);

  const completedResult = {
    id: solicitudDb.id ?? `sol-${Date.now()}`,
    correlationId,
    idempotencyKey,
    estado: "completado" as const,
    history,
    tier,
    tierLabel: tierLabel(tier),
    motorUsado: processingModeForTier(tier),
    tiempoEstimado: tierWaitEstimate(tier),
    predioNombre,
    satelitesSolicitados: satellites,
    variablesSolicitadas: variables,
    bbox: derivedBBox,
    medicionPreview: result,
    interpretacionPreview: interpretMeasurement(result),
    informe: report,
    mensaje: `Solicitud creada para ${predioNombre}. Nivel ${tierLabel(tier)} asignado correctamente.`,
  };

  idempotencyStore.set(idempotencyKey, completedResult);
  await writeWorkflowLogDb(tenantId, "createAnalysis", "exitoso", null, completedResult, accessToken);
  return completedResult;
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
    }),
    onboarding: router({
      createTenant: protectedProcedure.input(z.object({ organizationName: z.string().min(2), planId: planSchema })).mutation(({ input }) => ({
        data: { tenantId: `tenant-${Date.now()}`, nombre: input.organizationName, planId: input.planId, estado: "trial" as const },
        error: null,
      })),
    }),
    apiKeys: router({
      create: protectedProcedure.input(z.object({ tenantId: z.string().min(1), nombre: z.string().min(2) })).mutation(({ input }) => {
        const plainKey = `cl_${randomBytes(18).toString("hex")}`;
        const hash = createHash("sha256").update(plainKey).digest("hex");
        return { data: { tenantId: input.tenantId, nombre: input.nombre, key: plainKey, hash, warning: "La key se muestra una sola vez en este stub." }, error: null };
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
