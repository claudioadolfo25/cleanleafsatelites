import { COOKIE_NAME } from "@shared/const";
import {
  getSatelitesHabilitados,
  getSatelliteConfigurationStatus,
  satelliteCatalog,
  satelliteValidationMessage,
  validarSatelitesSolicitados,
  type SatelliteId,
  type Vertical,
} from "@shared/satellite-catalog";
import { interpretMeasurement } from "@shared/interpretation";
import { getCopernicusResources, type Sector } from "@shared/copernicus-catalog";
import { validateSatelliteVariable } from "@shared/analysis-validation";
import { assertTransition, type AnalysisStatus } from "@shared/analysis-state";
import { buildAnalysisReport, MockCopernicusProvider } from "@shared/observation-provider";
import { validatePlanLimits, type PlanId } from "@shared/plan-limits";
import { getTierForSuperficie, processingModeForTier, tierWaitEstimate } from "@shared/satellite-router";
import { querySentinel, tierLabel } from "@shared/satellite-service";
import { getReport, listReports } from "@shared/report-catalog";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

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
});

type AnalysisInput = z.infer<typeof analysisInput>;
const idempotencyStore = new Map<string, unknown>();
const observationProvider = new MockCopernicusProvider();

async function createAnalysisRequest(input: AnalysisInput) {
  const satellites = input.satellites as SatelliteId[];
  if (!validarSatelitesSolicitados(input.vertical, satellites)) {
    throw new Error(satelliteValidationMessage(input.vertical, satellites));
  }

  const variables = satellites.map((satellite, index) => input.variables[index] ?? satelliteCatalog[satellite].variables[0]?.variable).filter((value): value is string => Boolean(value));
  satellites.forEach((satellite, index) => validateSatelliteVariable(satellite, variables[index]));
  const correlationId = input.correlationId ?? `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idempotencyKey = input.idempotencyKey ?? `${input.predioId}:${satellites.join(",")}:${variables.join(",")}:${input.periodFrom ?? "default"}:${input.periodTo ?? "default"}`;
  const previous = idempotencyStore.get(idempotencyKey);
  if (previous) return previous;

  const tier = getTierForSuperficie(input.hectareas);
  const planResult = validatePlanLimits(input.planId as PlanId, tier, input.hectareas, {
    haMesUsadas: input.haMesUsadas,
    prediosActivos: input.prediosActivos,
  });
  if (!planResult.allowed) throw new Error(`${planResult.code}: ${planResult.message}`);

  const id = `sol-${Date.now()}`;
  if (tier === "tier3_regional") {
    const regionalResult = {
      id,
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
    return regionalResult;
  }

  const firstSatellite = satellites[0];
  const firstVariable = variables[0];
  const history: AnalysisStatus[] = ["pendiente", "en_cola", "procesando"];
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
  return completedResult;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  cleanleaf: router({
    dashboard: publicProcedure.query(() => demoDashboard),
    reports: router({
      list: publicProcedure.input(z.object({ search: z.string().optional(), predio: z.string().optional(), satellite: z.string().optional(), status: z.enum(["todos", "pendiente", "en_cola", "procesando", "completado", "error_reintentable", "error_final", "requiere_revision", "cancelado"]).optional() }).optional()).query(({ input }) => listReports(input)),
      getById: publicProcedure.input(z.object({ id: z.string().min(1) })).query(({ input }) => getReport(input.id) ?? null),
    }),
    catalog: publicProcedure.input(z.object({ vertical: verticalSchema }).optional()).query(({ input }) => {
      const vertical = input?.vertical ?? "agricultura";
      return getSatelitesHabilitados(vertical).map(id => satelliteCatalog[id]);
    }),
    configStatus: publicProcedure.input(z.object({ vertical: verticalSchema }).optional()).query(({ input }) => getSatelliteConfigurationStatus(input?.vertical ?? "agricultura")),
    resources: publicProcedure.input(z.object({ sector: sectorSchema }).optional()).query(({ input }) => getCopernicusResources((input?.sector ?? "agricultura") as Sector)),
    createAnalysis: publicProcedure.input(analysisInput).mutation(({ input }) => createAnalysisRequest(input)),
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
      }),
    }),
    onboarding: router({
      createTenant: publicProcedure.input(z.object({ organizationName: z.string().min(2), planId: planSchema })).mutation(({ input }) => ({
        data: { tenantId: `tenant-${Date.now()}`, nombre: input.organizationName, planId: input.planId, estado: "trial" as const },
        error: null,
      })),
    }),
    apiKeys: router({
      create: publicProcedure.input(z.object({ tenantId: z.string().min(1), nombre: z.string().min(2) })).mutation(({ input }) => {
        const plainKey = `cl_${randomBytes(18).toString("hex")}`;
        const hash = createHash("sha256").update(plainKey).digest("hex");
        return { data: { tenantId: input.tenantId, nombre: input.nombre, key: plainKey, hash, warning: "La key se muestra una sola vez en este stub." }, error: null };
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
