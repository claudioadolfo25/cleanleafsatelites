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
import { querySentinel, resolveTier, tierLabel } from "@shared/satellite-service";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const satelliteSchema = z.enum(["sentinel-1", "sentinel-2", "sentinel-3"]);
const verticalSchema = z.enum(["agricultura", "acuicultura", "forestal"]);

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
      { fecha: "08 Ago", valor: 0.49 },
      { fecha: "13 Ago", valor: 0.53 },
      { fecha: "18 Ago", valor: 0.58 },
      { fecha: "23 Ago", valor: 0.55 },
      { fecha: "28 Ago", valor: 0.61 },
      { fecha: "02 Sep", valor: 0.64 },
      { fecha: "07 Sep", valor: 0.68 },
    ],
    "sentinel-1": [
      { fecha: "08 Ago", valor: -18.4 },
      { fecha: "13 Ago", valor: -17.8 },
      { fecha: "18 Ago", valor: -19.1 },
      { fecha: "23 Ago", valor: -18.7 },
      { fecha: "28 Ago", valor: -17.9 },
      { fecha: "02 Sep", valor: -17.4 },
      { fecha: "07 Sep", valor: -16.8 },
    ],
  },
  alerts: [
    { id: "a-1", nivel: "atención", titulo: "El Aromo necesita una revisión", detalle: "El vigor bajó 0,08 puntos en los últimos 15 días.", accion: "Ver zona" },
    { id: "a-2", nivel: "info", titulo: "Nueva imagen disponible", detalle: "Sentinel-2 actualizó Las Quinas hace 2 días.", accion: "Ver datos" },
  ],
};

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
    catalog: publicProcedure
      .input(z.object({ vertical: verticalSchema }).optional())
      .query(({ input }) => {
        const vertical = input?.vertical ?? "agricultura";
        const enabled = getSatelitesHabilitados(vertical);
        return enabled.map(id => satelliteCatalog[id]);
      }),
    configStatus: publicProcedure
      .input(z.object({ vertical: verticalSchema }).optional())
      .query(({ input }) => getSatelliteConfigurationStatus(input?.vertical ?? "agricultura")),
    createAnalysis: publicProcedure
      .input(
        z.object({
          predioId: z.string().min(1),
          predioNombre: z.string().min(1),
          hectareas: z.number().positive().max(1_000_000),
          vertical: verticalSchema,
          satellites: z.array(satelliteSchema).min(1),
        }),
      )
      .mutation(async ({ input }) => {
        const satellites = input.satellites as SatelliteId[];
        if (!validarSatelitesSolicitados(input.vertical, satellites)) {
          const message = satelliteValidationMessage(input.vertical, satellites);
          throw new Error(message);
        }

        const tier = resolveTier(input.hectareas);
        const firstSatellite = satellites[0];
        const result = await querySentinel(input.predioId, firstSatellite);

        return {
          id: `sol-${Date.now()}`,
          estado: "en_proceso",
          tier,
          tierLabel: tierLabel(tier),
          predioNombre: input.predioNombre,
          satelitesSolicitados: satellites,
          medicionPreview: result,
          mensaje: `Solicitud creada para ${input.predioNombre}. Nivel ${tierLabel(tier)} asignado correctamente.`,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
