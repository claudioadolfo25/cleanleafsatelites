# AgroPulso — Auditoría Funcional (Solo Lectura)

**Fecha:** 24 de Septiembre de 2026
**Entorno:** Sandbox Jules / Node v24 / pnpm v10
**Estatus:** Auditoría Funcional de Solo Lectura

---

## Resultados de Comandos de Verificación Inmediata

1. **Instalación (`pnpm install` / `npm install`):** **ÉXITO**. Se instalaron 752 paquetes sin errores.
2. **Compilación (`pnpm build` / `npm run build`):** **ÉXITO**. Vite empaquetó `dist/public` (2392 módulos transformados) y ESBuild generó `dist/index.js` en 11 ms. Emite advertencia sobre chunk principal > 500 kB.
3. **Pruebas y Verificación de Tipos (`pnpm check` & `pnpm test`):** **ÉXITO**.
   - `pnpm check` (`tsc --noEmit`): 0 errores de TypeScript.
   - `pnpm test` (`vitest run`): 2 archivos de prueba pasados (`server/auth.logout.test.ts` y `server/satellite-domain.test.ts`), 28 tests ejecutados y aprobados (100% pasando).
4. **PostgreSQL / PostGIS y Migraciones (`supabase/migrations/`):** **NO VERIFICADO**. En el entorno de prueba aislado no hay un servicio activo de PostgreSQL/PostGIS ni credenciales de Supabase Auth. La estructura SQL fue auditada directamente desde `supabase/schema.sql` y `supabase/seed.sql`.

---

## A. STACK REAL
- **Frontend:** React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 4 + Wouter (router SPA).
- **Backend Node/Express (Plantilla WebDev):** Express 4 + tRPC v11 + Drizzle ORM (MySQL2) sirviendo API v1 estática y endpoints en memoria.
- **Autenticación:** Cookie de sesión simulada (`COOKIE_NAME`) y OpenID stub (`manus`).
- **Base de Datos / Persistencia:**
  - Persistencia en memoria/stub local en Node runtime.
  - Objetivo de migración: Supabase PostgreSQL + PostGIS (`supabase/schema.sql`).

---

## B. RESTOS DE MANUS, FORGE, TRPC, DRIZZLE, MYSQL, TIDB

| Término | Archivo y Línea Exactos | Contexto |
| --- | --- | --- |
| **drizzle-kit** | `package.json:13`, `package.json:93` | Script `db:push` y devDependency `drizzle-kit@^0.31.4` |
| **trpc** | `package.json:46-48` | Dependencias `@trpc/client`, `@trpc/react-query`, `@trpc/server` |
| **drizzle-orm** | `package.json:56` | Dependencia `drizzle-orm@^0.44.5` |
| **mysql2** | `package.json:63` | Dependencia `mysql2@^3.15.0` |
| **manus** | `package.json:103` | devDependency `vite-plugin-manus-runtime@0.0.59` |
| **manus** | `vite.config.ts:10,12,79,88` | Configuración de plugin y colector de logs `vitePluginManusRuntime` |
| **trpc** | `client/src/lib/trpc.ts:1-4` | Cliente `@trpc/react-query` conectado a `AppRouter` |
| **trpc** | `server/_core/trpc.ts:1-25` | Inicialización de procedimientos y contexto tRPC |
| **drizzle / mysql** | `drizzle/schema.ts:1-20` | Esquema Drizzle usando `mysqlTable`, `mysqlEnum`, `drizzle-orm/mysql-core` |
| **drizzle / mysql** | `server/db.ts:1-3,6,11` | Conexión Drizzle MySQL2 mediante `drizzle-orm/mysql2` |
| **trpc / manus** | `server/routers.ts:4-10` | Router tRPC `appRouter` y autenticación en memoria |
| **manus** | `server/auth.logout.test.ts:24` | Contexto de prueba con `loginMethod: "manus"` |
| **drizzle / mysql** | `supabase/schema.sql:2` | Comentario aclaratorio: "The current WebDev runtime uses Drizzle/MySQL..." |

---

## C. MATRIZ DE FUNCIONALIDAD

| Función | Estado | Notas / Justificación |
| --- | --- | --- |
| **Registro** | SOLO MOCK | El backend no posee auth real de Supabase ni registro de usuarios. |
| **Login** | SOLO MOCK | Retorna contexto estático en memoria en `auth.me` o sesión de cookies stub. |
| **Magic link** | NO EXISTE | No hay proveedor ni flujo de correo magic link configurado. |
| **Recuperar contraseña** | NO EXISTE | No hay flujo ni endpoint de recuperación de contraseña. |
| **Invitaciones** | NO EXISTE | Sin endpoints ni vista de invitación a la plataforma. |
| **Onboarding** | SOLO MOCK | Endpoint `apiV1.onboarding.createTenant` retorna respuesta simulada en memoria. |
| **Crear tenant** | SOLO MOCK | El esquema Supabase `tenants` existe como SQL, pero no se persiste desde el runtime Node. |
| **Crear parcela con polígono** | SOLO MOCK | Formulario interactivo en `SolicitudAnalisisForm.tsx` calcula hectáreas en frontend, pero se procesa como stub. |
| **Ciclo de campaña** | EXISTE SIN VERIFICAR | Modelado en `shared/types.ts` y `supabase/schema.sql`, sin backend FastAPI/Worker. |
| **Alertas** | SOLO MOCK | Componentes en UI muestran tarjetas de alerta estáticas/simuladas. |
| **Bitácora** | NO EXISTE | Sin módulo de registro de bitácora agrícola. |
| **Catálogo de satélites** | FUNCIONA (verificado) | `shared/satellite-catalog.ts` y `shared/copernicus-catalog.ts` validan verticals y fail-safe. |
| **Informes** | FUNCIONA (verificado) | `/dashboard/informes` y `/dashboard/informes/:id` procesan datos deterministas para Tier 1 y 2. |
| **`/equipo`** | NO EXISTE | No existe pantalla ni módulo de gestión de equipo. |
| **`/admin`** | SOLO MOCK | Schema `supabase/seed.sql` contiene rol `super_admin`, pero no hay panel admin interactivo. |
| **Facturación** | SOLO MOCK | Tiers y límites definidos en `shared/plan-limits.ts`, sin pasarela de pagos Stripe/Mercado Pago. |
| **Leads corporativos** | NO EXISTE | No hay formulario ni captador de leads en la landing de la web corporativa. |

---

## D. BASE DE DATOS Y SEGURIDAD

- **Aislamiento Multi-Tenant (RLS):**
  - Todas las tablas de negocio en `supabase/schema.sql` poseen `tenant_id uuid NOT NULL` y políticas RLS explícitas.
  - La función `get_current_tenant_id()` consulta la metadata del token JWT: `(auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid`.
  - **Seguridad en la Base:** El aislamiento está modelado en PostgreSQL/RLS, pero la app Node.js actual no ejecuta consultas a Supabase Postgres directamente.

- **Deficiencias de Geometría e Identificadores:**
  - `supabase/schema.sql` define los predios con `geometria_geojson jsonb`. **NO usa el tipo `geometry(Polygon, 4326)` de PostGIS**, por lo que los cálculos espaciales dependen del cliente o de conversión explícita.
  - La base usa UUIDs válidos para `tenant_id`, pero faltan tipos espaciales nativos PostGIS.

- **Riesgo de Aislamiento:**
  - En la aplicación Node Express actual, no hay verificación de JWT contra Supabase. El aislamiento sólo está simulado a nivel de variables de JavaScript en memoria.

---

## E. SECRETOS

- **Ficheros de Entorno:** `.env` no está commiteado. `.env.example` o `docs/satellite-env.example` documentan variables sin revelar claves reales.
- **Frontend `VITE_*` Variables:** `client/src/main.tsx` lee `%VITE_ANALYTICS_ENDPOINT%` y `%VITE_ANALYTICS_WEBSITE_ID%`. No contienen claves privadas ni credenciales administrativas.
- **Historial Git:** No se detectaron tokens o secretos hardcodeados en el repositorio.

---

## F. LO QUE FALTA PARA FUNCIONAR (LISTA PRIORIZADA DE BLOQUEOS)

1. **Backend FastAPI y Autenticación Supabase JWT (CRÍTICO):**
   - *Resuelve:* Código (FastAPI) + Configuración (Supabase Auth).
   - Faltan los endpoints de producción, middleware de auth que lea `app_metadata` y la conexión con PostGIS.
2. **PostGIS en Supabase / Migraciones (`geometry`):**
   - *Resuelve:* Código de migración SQL.
   - Cambiar `jsonb` a `geometry(Polygon, 4326)` en la tabla `predios`.
3. **Pipeline Satelital Real (Copernicus CDSE API):**
   - *Resuelve:* Claves externas (OAuth2 Client ID / Secret de Copernicus) + Código (Worker/Backend).
4. **Integración de Pagos (Stripe / Mercado Pago):**
   - *Resuelve:* Claves externas + Código (BillingService backend).
5. **Agente Agrícola Llama / OpenAI:**
   - *Resuelve:* Claves externas (`OPENAI_API_KEY`) + Backend.

---

## G. CLAVES Y SERVICIOS EXTERNOS NECESARIOS

- **Supabase:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Copernicus CDSE:** `COPERNICUS_CLIENT_ID`, `COPERNICUS_CLIENT_SECRET`.
- **OpenAI / LLM:** `OPENAI_API_KEY`.
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- **Mercado Pago:** `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`.

---

## H. LO QUE NO SE PUDO VERIFICAR

1. **Ejecución de Migraciones SQL en vivo:** No se dispone de un servidor PostgreSQL/PostGIS ni instancia Supabase local activa en el contenedor de ejecución.
2. **Conexión a APIs Satelitales Reales:** No existen credenciales activas para Copernicus CDSE o Sentinel Hub.
3. **Flujo completo End-to-End de Auth Supabase:** La aplicación usa actualmente el runtime Node/Express de demostración con cookies simuladas.

---

## I. RECOMENDACIÓN

1. **CONSERVAR:** La capa de catálogo satelital (`shared/satellite-catalog.ts`), la lógica de tiers/enrutamiento por superficie (`shared/satellite-router.ts`), la interpretación determinista (`shared/interpretation.ts`) y la UI React SPA (`client/src/`).
   - *Justificación:* Tienen excelente cobertura de pruebas unitarias (28/28 pasando), tipado estricto y una arquitectura limpia y desacoplada.
2. **CORREGIR:** El esquema de Supabase (`supabase/schema.sql`) para utilizar tipos `geometry(Polygon, 4326)` PostGIS en lugar de `jsonb` para la tabla `predios`.
   - *Justificación:* Permite indexación espacial R-Tree (`GIST`) y cálculos geográficos nativos en la base de datos.
3. **REHACER:** Reemplazar el runtime Node.js/tRPC/Express de demostración por el backend FastAPI en Python (según las especificaciones de `AGENTS.md`).
   - *Justificación:* Se requiere un servidor Python robusto para trabajadores asíncronos (Celery/ARQ), cálculo satelital y conexión directa con Supabase RLS.
