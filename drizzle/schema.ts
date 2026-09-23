import {
  boolean,
  date,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Parcelas agrícolas (polígono GeoJSON y superficie en hectáreas)
 */
export const parcelas = mysqlTable("parcelas", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  poligonoGeojson: text("poligono_geojson").notNull(),
  areaHa: decimal("area_ha", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Temporadas / ciclos agrícolas
 */
export const temporadas = mysqlTable("temporadas", {
  id: varchar("id", { length: 64 }).primaryKey(),
  parcelaId: varchar("parcela_id", { length: 64 }).notNull(),
  ciclo: varchar("ciclo", { length: 64 }).notNull(), // ej: "2026-2027"
  faseActual: int("fase_actual").default(0).notNull(), // 0-5
  metaRendimientoTonHa: decimal("meta_rendimiento_ton_ha", { precision: 10, scale: 2 }),
  rendimientoRealTonHa: decimal("rendimiento_real_ton_ha", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Análisis de laboratorio de suelo
 */
export const analisisSuelo = mysqlTable("analisis_suelo", {
  id: varchar("id", { length: 64 }).primaryKey(),
  temporadaId: varchar("temporada_id", { length: 64 }).notNull(),
  ph: decimal("ph", { precision: 4, scale: 2 }),
  nKgHa: decimal("n_kg_ha", { precision: 8, scale: 2 }),
  pKgHa: decimal("p_kg_ha", { precision: 8, scale: 2 }),
  kKgHa: decimal("k_kg_ha", { precision: 8, scale: 2 }),
  materiaOrganicaPct: decimal("materia_organica_pct", { precision: 5, scale: 2 }),
  fechaAnalisis: date("fecha_analisis"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Labores de campo registradas en bitácora
 */
export const labores = mysqlTable("labores", {
  id: varchar("id", { length: 64 }).primaryKey(),
  temporadaId: varchar("temporada_id", { length: 64 }).notNull(),
  fase: int("fase").notNull(),
  tipo: varchar("tipo", { length: 128 }).notNull(), // siembra, fertilizacion, riego, monitoreo
  fecha: date("fecha").notNull(),
  descripcion: text("descripcion"),
  fotoUrl: text("foto_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Alertas satelitales con motor de confianza auditable
 */
export const alertas = mysqlTable("alertas", {
  id: varchar("id", { length: 64 }).primaryKey(),
  temporadaId: varchar("temporada_id", { length: 64 }).notNull(),
  zona: varchar("zona", { length: 128 }).notNull(), // ej: "Zona Norte"
  tipo: varchar("tipo", { length: 128 }).notNull(), // "bajo_vigor", "estres_hidrico", etc.
  deteccion: text("deteccion").notNull(),
  hipotesisJson: text("hipotesis_json").notNull(), // array JSON de posibles causas
  accionRecomendada: text("accion_recomendada").notNull(),
  confianza: mysqlEnum("confianza", ["alto", "medio", "bajo", "no_concluyente"]).notNull(),
  factoresConfianzaJson: text("factores_confianza_json").notNull(), // array JSON de razones
  fechaImagen: date("fecha_imagen").notNull(),
  leida: boolean("leida").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Interacciones del Agente 44.05
 */
export const agenteMensajes = mysqlTable("agente_mensajes", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  temporadaId: varchar("temporada_id", { length: 64 }).notNull(),
  rol: mysqlEnum("rol", ["user", "assistant", "tool"]).notNull(),
  contenidoJson: text("contenido_json").notNull(),
  herramientasUsadasJson: text("herramientas_usadas_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Registro de aprendizaje del agricultor (Fase 5)
 */
export const aprendizaje = mysqlTable("aprendizaje", {
  id: varchar("id", { length: 64 }).primaryKey(),
  alertaId: varchar("alerta_id", { length: 64 }).notNull(),
  accionUsuario: varchar("accion_usuario", { length: 128 }).notNull(), // seguir, ignorar, modificar
  resultado: text("resultado"),
  fueUtil: boolean("fue_util"),
  datoFaltante: text("dato_faltante"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
