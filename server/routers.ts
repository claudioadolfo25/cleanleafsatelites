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
import {
  createSolicitudAnalisisDb,
  getReportByIdDb,
  getTenantUsageAndLimits,
  listReportsDb,
  recordConsumoDb,
  saveInformeDb,
  saveMedicionesDb,
  writeWorkflowLogDb,
} from "./db/repository";

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
  predioNombre: z.string().min(1),
  hectareas: z.number().positive().max(1_000_000),
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

  // 1. Obtener uso y límites calculados en servidor desde DB
  const { planId, haMesUsadas, prediosActivos } = await getTenantUsageAndLimits(tenantId, accessToken);
  const tier = getTierForSuperficie(input.hectareas);

  const planResult = validatePlanLimits(planId, tier, input.hectareas, {
    haMesUsadas,
    prediosActivos,
  });
  if (!planResult.allowed) throw new Error(`${planResult.code}: ${planResult.message}`);

  // 2. Persistir/recuperar la solicitud por idempotencia (tenant_id + idempotency_key) en DB
  const solicitudDb = await createSolicitudAnalisisDb({
    tenant_id: tenantId,
    predio_id: input.predioId,
    superficie_ha: input.hectareas,
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
      predioNombre: input.predioNombre,
      satelitesSolicitados: satellites,
      variablesSolicitadas: variables,
      mensaje: "Este análisis regional requiere evaluación antes de consumir cuota o iniciar procesamiento.",
    };
    idempotencyStore.set(idempotencyKey, regionalResult);
    await writeWorkflowLogDb(tenantId, "createAnalysis", "exitoso", null, regionalResult, accessToken);
    return regionalResult;
  }

  // 3. Procesar medición
  const firstSatellite = satellites[0];
  const firstVariable = variables[0];
  const history: AnalysisStatus[] = ["pendiente", "en_cola", "procesando"];
  assertTransition(history[0], history[1]);
  assertTransition(history[1], history[2]);
  const result = await observationProvider.query({ predioId: input.predioId, satellite: firstSatellite, variable: firstVariable, tier, periodFrom: input.periodFrom, periodTo: input.periodTo, bbox: input.bbox });
  const report = buildAnalysisReport({ id: solicitudDb.id ?? `sol-${Date.now()}`, predioId: input.predioId, predioNombre: input.predioNombre, tier, measurement: result, periodFrom: input.periodFrom, periodTo: input.periodTo });
  history.push("completado");
  assertTransition(history[2], history[3]);

  // 4. Guardar Informe, Mediciones, Consumo y Logs en DB
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

  await recordConsumoDb(tenantId, input.hectareas, accessToken);

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
    predioNombre: input.predioNombre,
    satelitesSolicitados: satellites,
    variablesSolicitadas: variables,
    medicionPreview: result,
    interpretacionPreview: interpretMeasurement(result),
    informe: report,
    mensaje: `Solicitud creada para ${input.predioNombre}. Nivel ${tierLabel(tier)} asignado correctamente.`,
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
  cleanleaf: router({
    dashboard: protectedProcedure.query(({ ctx }) => {
      const isDemoMode = process.env.DEMO_MODE === "true" && !isProductionEnv();
      if (isDemoMode) {
        return demoDashboard;
      }
      return {
        ...demoDashboard,
        tenant: {
          ...demoDashboard.tenant,
          nombre: `Organización (${ctx.user.tenantId})`,
        },
      };
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
