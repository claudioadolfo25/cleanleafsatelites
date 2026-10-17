# Informe de Auditoría Espejo de la Plataforma v3 (Cleanleaf / AgroPulso)

**Fecha de ejecución:** 17 de Octubre de 2026
**Rama evaluada:** `main` (commit HEAD `937510d`)
**Autor:** Jules (Software Engineer Agent)
**Estado de modificación del código fuente:** SIN CAMBIOS EN CÓDIGO FUENTE / SOLO LECTURA (único archivo creado: `docs/AUDITORIA_ESPEJO_PLATAFORMA_v3.md`).

---

## Documentación de la Línea Base Real y Presencia de Fases en `main`

### 1. Registro de Git Log
- **Último commit en `main`:** `937510d` — *Hotfix: reparar sintaxis en server/copernicus.test.ts (#22)* (17 Oct 2026).
- **PRs mergeados a `main` desde el commit `937510d`:** **0 PRs**. La rama `main` se mantiene en el commit `937510d`.

### 2. Recuento de Pruebas de `pnpm test`
- **Archivos de prueba:** **6 archivos** (coincide exactamente con v2).
- **Tests ejecutados y pasados:** **48 pasados de 48** (0 fallados).

### 3. Matriz de Presencia de Fases del Plan (Fases 0 a 10 y C1 a C4) en `main`

| Fase | Título de la Fase | Estado en `main` | Evidencia Exacta (Ruta de Archivo / Ausencia) |
| --- | --- | --- | --- |
| **Fase 0** | Setup, Diagnóstico Base, Render & CI | **PARCIAL** | Exite `server/app.ts`, `render.yaml`, y `.github/workflows/ci.yml`. |
| **Fase 1** | Autenticación Supabase (Email/SMS/Google) & Landing Page | **PARCIAL** | Vistas `LandingPage.tsx` y `AuthPage.tsx` existen en cliente, pero `server/_core/context.ts` no verifica Supabase Auth en backend. |
| **Fase 2** | Bridge tRPC + Supabase JWT Multi-tenant Isolation | **NO** | `server/_core/context.ts` no verifica JWTs de Supabase. `server/db/repository.ts` no existe en `main`. |
| **Fase 3** | Gating de Copernicus CDSE Staging con Fallback | **SÍ** | `server/copernicus.ts:40` (`isCopernicusLiveEnabled`) e `isCopernicusStagingAuthorized`. |
| **Fase 4** | Persistencia de Solicitudes e Informes en Supabase | **NO** | `server/routers.ts:82` usa `idempotencyStore` en RAM (`Map`). `shared/report-catalog.ts` usa catálogo en memoria. |
| **Fase 5** | Motor Copernicus Avanzado, Time Series & DB Caching | **NO** | No existe `server/services/copernicus-time-series-service.ts` ni tabla `observaciones_serie`. Caché vive en RAM (`resultCache`). |
| **Fase 6** | Worker Asíncrono & Flujo Decoupled | **NO** | No existe `server/services/analysis-worker.ts` ni `server/worker.ts`. `createAnalysisRequest` ejecuta peticiones síncronas. |
| **Fase 7** | Predios con Geometría GeoJSON, PostGIS & BBOX Dinámico | **NO** | No existe `server/geometry.ts`. `server/copernicus.ts:251` usa BBOX hardcodeado en Araucanía (`[-72.6, -38.7, -72.5, -38.6]`). |
| **Fase 8** | Generación de Reportes PDF con PDFKit & Supabase Storage | **NO** | No existe `server/reports/pdf-service.ts` ni `server/reports/storage-service.ts`. `ReportDownloadActions.tsx:28` invoca `window.print()`. |
| **Fase 9** | Módulo de Interpretación Agronómica y Reglas de Recomendación | **NO** | No existe `server/analysis/interpret.ts` ni `recommendation-rules.json`. |
| **Fase 10** | Admin Console, Audit Logs, API Keys & Emails | **NO** | No existe `client/src/pages/AdminDashboardPage.tsx`, ni sub-router `admin` en `server/routers.ts`, ni `server/services/notification-service.ts`. |
| **Fase C1** | Políticas Operacionales Copernicus, Cuotas, SCL & Cache DB | **NO** | No existe `server/services/copernicus-policy-service.ts`. |
| **Fase C2** | STAC Catalog Search & Provenance Attribution | **PARCIAL** | `server/stac-client.ts` existe para búsqueda STAC v1, pero no existe `server/services/copernicus-scenes-service.ts` ni tabla `escenas`. |
| **Fase C3** | Open-Meteo Weather Service & Muestras de Suelo | **NO** | No existe `shared/weather-service.ts`. |
| **Fase C4** | Orquestación de Agentes Especialistas de Dominio | **NO** | No existe `server/agent/` ni endpoint `/api/v1/agent/orchestrate`. |

---

## Resultados Comprobatorios de Comandos de Construcción y Pruebas

Los comandos requeridos fueron ejecutados en la raíz de la plataforma con los siguientes resultados exactos:

1. **`pnpm install --frozen-lockfile`**
   - **Resultado:** Exitoso (783 paquetes verificados).

2. **`pnpm check` (`tsc --noEmit`)**
   - **Resultado:** Exitoso (**0 errores de TypeScript**).

3. **`pnpm test` (`vitest run`)**
   - **Resultado:** Exitoso (**6 archivos de pruebas pasados, 48 pruebas pasadas de 48**).

4. **`pnpm build` (`vite build && esbuild`)**
   - **Resultado:** Exitoso. Bundles en `dist/`: Servidor `dist/index.js` (**83.3 kB**), Cliente Bundle Principal `index-cg7ISrE_.js` (**499.74 kB**), Vendor Charts `vendor-charts-Bt_LSy95.js` (**404.70 kB**).

5. **`pnpm audit` y `pnpm audit --prod`**
   - **`pnpm audit` (dev + prod):** **164 vulnerabilidades detectadas** (13 LOW, 86 MODERATE, 59 HIGH, 6 CRITICAL).
   - **`pnpm audit --prod` (solo producción):** **92 vulnerabilidades detectadas** (12 LOW, 55 MODERATE, 23 HIGH, 2 CRITICAL).
   - **Vulnerabilidades críticas en producción:**
     - `express@4.21.2` dependiente de `body-parser@1.20.3` (`GHSA-v422-hmwv-36x6` - DoS en body-parser).

---

## 1. Resumen Ejecutivo y Veredicto

### Qué mejoró respecto a v1:
- Se mantiene la estabilidad de compilación y pasaron los 48 tests de la suite tras el hotfix #22 (`server/copernicus.test.ts`).
- Se mantiene la integración del cliente Tellus OAuth2 CDSE en `server/copernicus.ts` con manejo tipado de errores.
- Se conserva el pipeline CI en `.github/workflows/ci.yml`.

### Qué sigue mal y bloquea producción:
- **Desacoplamiento total entre Backend Runtime y Supabase Postgres:** Todo el runtime tRPC en `server/routers.ts` sigue operando sobre estructuras en memoria (`idempotencyStore` Map, `demoDashboard`, `demoReports`). Ningún procedimiento tRPC consulta ni persiste datos en Supabase Postgres.
- **Autenticación Insegura en tRPC:** Todos los procedimientos tRPC en `server/routers.ts` siguen expuestos mediante `publicProcedure`.
- **Elusión de Cuotas desde el Cliente:** `cleanleaf.createAnalysis` y `apiV1.solicitudes.create` leen `planId`, `haMesUsadas` y `prediosActivos` directamente desde la entrada del cliente.
- **Stubs de Exportación de Informes:** Los botones de exportación a PDF (`window.print()`) y Word son stubs de cliente sin URLs firmadas de Supabase Storage.
- **Procesamiento de análisis síncrono:** La consulta a Copernicus se ejecuta síncronamente dentro del handler tRPC sin worker asíncrono.

---

## 2. Inventario de Rutas Frontend y Navegación

### Rutas registradas en `client/src/App.tsx:28-54`
- `/` -> `LandingPage.tsx` (**REAL**)
- `/auth` -> `AuthPage.tsx` (**REAL**)
- `/satelites` -> `SatellitesPlaceholderPage.tsx` (**REAL**)
- `/dashboard` -> `ProtectedRoute` -> `Home.tsx` (**PARCIAL** - consume `demoDashboard`)
- `/dashboard/configuracion/satelites` -> `ProtectedRoute` -> `SatelliteConfiguration.tsx` (**PARCIAL** - guarda en `localStorage`)
- `/dashboard/informes` -> `ProtectedRoute` -> `ReportsDashboard.tsx` (**PARCIAL** - consume catálogo en memoria)
- `/dashboard/informes/:id` -> `ProtectedRoute` -> `ReportDetail.tsx` (**PARCIAL**)
- `/404` -> `NotFound.tsx` (**REAL**)

### Enlaces muertos, placeholders y código huérfano
- **`DashboardLayout.tsx` (Huérfano):** Ubicado en `client/src/components/DashboardLayout.tsx`. Define enlaces en las líneas 31-32:
  ```ts
  const menuItems = [
    { icon: LayoutDashboard, label: "Page 1", path: "/" },
    { icon: Users, label: "Page 2", path: "/some-path" },
  ];
  ```
  La ruta `/some-path` es un **enlace muerto** que conduce a un 404. El componente `DashboardLayout` no se utiliza en ninguna página productiva.
- **`ComponentShowcase.tsx` (Huérfano):** Ubicado en `client/src/pages/ComponentShowcase.tsx`.
- **Rutas no implementadas:** `/dashboard/admin`, `/dashboard/perfil`, `/auth/restablecer-password`.

---

## 3. Autenticación y Sesión

- **Verificación de JWT de Supabase en Backend:** **MOCK / NO IMPLEMENTADO**.
  En `server/_core/context.ts:16`, `createContext` invoca `sdk.authenticateRequest(opts.req)`. En `server/_core/sdk.ts:182-243`, se verifica la cookie `manus-cookie` HS256 con `ENV.cookieSecret` (`JWT_SECRET`). No interactúa con `@supabase/supabase-js` ni verifica tokens JWT de Supabase.
- **Sistema de Cookies Heredado:** **REAL** (`COOKIE_NAME = "manus-cookie"` en `shared/const.ts:1`, `client/src/main.tsx:51`).
- **Logout:** **PARCIAL** (`auth.logout` borra cookie Manus, no revoca sesión en Supabase).
- **Reset/Cambio de Contraseña y Perfil:** **NO IMPLEMENTADO**.

---

## 4. Autorización y Aislamiento Multi-tenant

### Tabla Completa de Procedimientos tRPC

| Procedimiento | Nivel de Acceso | Origen de `tenantId` | Riesgo / Observación |
| --- | --- | --- | --- |
| `system.health` | `publicProcedure` | N/A | Health check del sistema |
| `system.notifyOwner` | `adminProcedure` | N/A | Requiere rol implícito en contexto heredado |
| `auth.me` | `publicProcedure` | Contexto heredado (`ctx.user`) | Devuelve usuario de la cookie Manus |
| `auth.logout` | `publicProcedure` | Contexto req/res | Borra cookie heredada |
| `cleanleaf.dashboard` | `publicProcedure` | N/A | **Crítico:** Si `DEMO_PUBLIC_DASHBOARD !== "false"` (por defecto `true`), es 100% público sin auth |
| `cleanleaf.reports.list` | `publicProcedure` | Ninguno | **Crítico:** Retorna catálogo completo de informes sin filtrar por tenant |
| `cleanleaf.reports.getById` | `publicProcedure` | Ninguno | **Crítico:** Cualquier ID de informe es accesible por cualquier usuario |
| `cleanleaf.catalog` | `publicProcedure` | Ninguno | Consulta pública de fuentes por vertical |
| `cleanleaf.configStatus` | `publicProcedure` | Ninguno | Consulta pública de estado de fuentes |
| `cleanleaf.resources` | `publicProcedure` | Ninguno | Consulta pública de catálogo Copernicus |
| `cleanleaf.catalogSearch` | `publicProcedure` | Ninguno | Búsqueda en catálogo STAC |
| `cleanleaf.createAnalysis` | `publicProcedure` | Entrada del cliente | **Crítico:** Permite inyección de `planId`, `haMesUsadas`, `prediosActivos` |
| `apiV1.health` | `publicProcedure` | N/A | Estado de API v1 |
| `apiV1.solicitudes.create` | `publicProcedure` | Entrada del cliente | Misma vulnerabilidad de elusión de cuotas |
| `apiV1.onboarding.createTenant` | `publicProcedure` | Generado en el handler | Stub sin persistencia ni validación |
| `apiV1.apiKeys.create` | `publicProcedure` | Body del cliente (`input.tenantId`) | **Crítico:** Genera API Key para cualquier `tenantId` sin verificar autorización |

---

## 5. Persistencia

### Auditoría Tabla por Tabla (Backend Runtime vs DB)

| Tabla SQL (`supabase/schema.sql`) | Estado en Runtime | Ubicación del Almacenamiento en Código |
| --- | --- | --- |
| `tenants` | **MOCK** | In-memory en `demoDashboard` (`server/routers.ts:35`) |
| `planes` | **MOCK** | Constantes en `shared/plan-limits.ts` |
| `users` | **PARCIAL** | MySQL vía Drizzle (`server/db.ts`) para Manus; no Supabase |
| `predios` | **MOCK** | Arreglo hardcodeado en `demoDashboard.predios` (`server/routers.ts:42`) |
| `suscripciones` | **NO IMPLEMENTADO** | No se lee ni escribe |
| `solicitudes_analisis` | **MOCK** | Mapa en RAM: `idempotencyStore = new Map()` (`server/routers.ts:82`) |
| `informes` | **MOCK** | Arreglo en RAM: `demoReports` en `shared/report-catalog.ts:16` |
| `mediciones` | **NO IMPLEMENTADO** | No se persiste en DB |
| `consumo` | **NO IMPLEMENTADO** | No se persiste en DB |
| `alertas` | **MOCK** | Arreglo hardcodeado en `demoDashboard.alerts` (`server/routers.ts:55`) |
| `api_keys` | **MOCK** | Mutación stub en `server/routers.ts:236` |
| `workflow_logs` | **NO IMPLEMENTADO** | No se registran logs en DB |

### Idempotencia
- **Dónde vive:** En memoria RAM (`const idempotencyStore = new Map<string, unknown>();` en `server/routers.ts:82`).
- **Composición de la clave:** `${input.predioId}:${satellites.join(",")}:${variables.join(",")}:${input.periodFrom ?? "default"}:${input.periodTo ?? "default"}`. **Falta crítica:** La clave **no incluye `tenantId`**.

---

## 6. Motor Copernicus

- **Casos de Uso Implementados:** `CopernicusCDSEProvider.query` (Statistical API) y `searchCatalog` (STAC v1).
- **Casos de Uso NO Implementados:** `getIndexTimeSeries`, `getProvenance`, `getFieldThumbnail`, `searchScenes` (solo UI handler).
- **BBOX vs Polígono:** Usa BBOX hardcodeado en Araucanía (`[-72.6, -38.7, -72.5, -38.6]` en `server/copernicus.ts:251`).
- **Máscara SCL:** Descarta píxeles `SCL === 3, 8, 9`.
- **Caché:** Mapa en RAM (`resultCache`) con TTL de 5 min.
- **Fallback Silencioso:** `FallbackObservationProvider` (`server/copernicus.ts:76-88`) captura errores y redirige silenciosamente a `SyntheticCopernicusProvider`.
- **Estado de la Variable `sst`:** Mapeada erróneamente a Sentinel-3 OLCI (`"sentinel-3-olci"` en `server/copernicus.ts:45`), leyendo la banda de clorofila `B01` en lugar del sensor térmico **SLSTR**.

---

## 7. Análisis Asíncrono y Worker

- Las solicitudes se ejecutan síncronamente en `server/routers.ts:100-170`.
- No existe worker asíncrono ni colas en `main`. Ante caídas del servidor, las consultas se pierden.

---

## 8. Dashboard, Predios e Informes

- **Datos e Informes:** Retorna objetos estáticos `demoDashboard` y `demoReports`.
- **Botones de Exportación (`ReportDownloadActions.tsx`):**
  - Markdown: REAL (Blob local).
  - PDF: MOCK / PARCIAL (`window.print()`).
  - Word: MOCK / PARCIAL (HTML string plano).
  - GeoJSON / Shapefile: NO IMPLEMENTADO.

---

## 9. Seguridad y Operación

- **Rate Limiting, Helmet & CORS:** NO IMPLEMENTADOS en Express (`server/app.ts`).
- **Validación de env al arrancar:** PARCIAL (`server/_core/env.ts` usa strings vacíos por defecto).
- **Vulnerabilidades:** 164 totales en `pnpm audit` / 92 en `pnpm audit --prod`.
- **Inyección de Prompt / Textos de Usuario:** Textos ingresados por el usuario (`predioNombre`, `organizationName`) se insertan directamente sin sanitizar en plantillas de informe.

---

## 10. Calidad

- **Cobertura:** 6 archivos de prueba pasados (48 tests). Todo el frontend React y módulos como `shared/report-catalog.ts` e `interpretation.ts` carecen de pruebas.
- **Rendimiento:** Bundle principal cliente `index-cg7ISrE_.js` (**499.74 kB**), Vendor Charts `vendor-charts-Bt_LSy95.js` (**404.70 kB**).

---

## Verificación de Despliegue y Pruebas de Aislamiento

### 1. Variables de Entorno Exigidas y Comportamiento ante Ausencia

| Variable | Requerida Por | Comportamiento si Falta |
| --- | --- | --- |
| `SUPABASE_URL` | Backend / Repository | No falla al arrancar; endpoints fallarán si intentan conectar. |
| `SUPABASE_ANON_KEY` | Cliente Supabase | Advertencia en consola de desarrollo. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend DB Admin | Operaciones administrativas fallan. |
| `COPERNICUS_CLIENT_ID` | Copernicus CDSE | Usa valor hardcodeado por defecto (`sh-79ab...`). |
| `COPERNICUS_CLIENT_SECRET` | Copernicus CDSE | Fallback activo; no ejecuta consultas reales a CDSE. |
| `JWT_SECRET` | Backend Auth SDK | Asigna string vacío `""`; firmas de sesión inseguras. |
| `DATABASE_URL` | Drizzle / MySQL | Fallo al intentar consultar base de datos MySQL de Manus. |

### 2. Pasos Manuales Requeridos para el Despliegue
1. **Migraciones de Base de Datos:** Ejecutar manualmente `supabase/schema.sql` en la instancia Postgres de Supabase.
2. **Auth Custom Claims Hook:** Crear la función SQL `auth.custom_access_token_hook` en Supabase y registrarla en las configuraciones de Auth para inyectar `tenant_id` y `role`.
3. **Storage Bucket:** Crear manualmente el bucket público/privado `reports` en Supabase Storage y aplicar políticas de acceso RLS.
4. **Worker Asíncrono:** Crear y configurar el servicio worker en Render si se desacopla la cola de análisis.

### 3. Pruebas Funcionales de Aislamiento Multi-Tenant
- **Estado:** **NO VERIFICADO**.
- **Explicación:** Dado que el backend en `main` no consulta Supabase Postgres ni filtra por RLS (lee arreglos globales en memoria), las pruebas de aislamiento multi-tenant no son ejecutables sobre el runtime actual.
- **Instrucciones para Ejecución Futura:**
  1. Crear `tenant_a` con `usuario_a` y `tenant_b` con `usuario_b` en Supabase Auth.
  2. Generar un informe `inf-1` perteneciente a `tenant_a`.
  3. Realizar una petición tRPC `cleanleaf.reports.getById({ id: "inf-1" })` con el token Bearer JWT de `usuario_b`.
  4. Confirmar que la respuesta sea `404 NOT_FOUND` o `UNAUTHORIZED`.

---

## 11. Matriz de Cierre y Diagnóstico Final

### Matriz de Cierre de Hallazgos v2 (21 de v1 + 4 Nuevos de v2)

| ID | Hallazgo Original | Estado Actual | Evidencia Exacta (Archivo:Línea) | Qué Falta para Cerrar |
| --- | --- | --- | --- | --- |
| **V1-01** | `cleanleaf.dashboard` público por defecto | **ABIERTO** | `server/routers.ts:184` | Exigir sesión obligatoria (`protectedProcedure`). |
| **V1-02** | Resto de procedimientos tRPC públicos | **ABIERTO** | `server/routers.ts:191,216,221,230,236` | Convertir a `protectedProcedure`. |
| **V1-03** | Autenticación dual (Supabase vs cookie Manus) | **ABIERTO** | `server/_core/context.ts:16` | Validar token JWT de Supabase en `context.ts`. |
| **V1-04** | `planId`, `haMesUsadas` tomados del cliente | **ABIERTO** | `server/routers.ts:63-76` | Leer suscripción y uso exclusivamente desde DB. |
| **V1-05** | `idempotencyStore` en RAM y clave sin tenant | **ABIERTO** | `server/routers.ts:82` | Persistir idempotencia en Postgres con `tenant_id`. |
| **V1-06** | Test de `app.test.ts` valida dashboard público | **ABIERTO** | `server/app.test.ts:28` | Exigir token de autenticación en el test. |
| **V1-07** | BBOX por defecto fijo en Araucanía | **ABIERTO** | `server/copernicus.ts:251` | Calcular BBOX dinámico desde geometría del predio en DB. |
| **V1-08** | Fallback sintético silencioso | **ABIERTO** | `server/copernicus.ts:76-88` | Notificar estado degradado al usuario de forma explícita. |
| **V1-09** | Textos hardcodeados en Home | **ABIERTO** | `client/src/pages/Home.tsx:130` | Conectar con datos reales del tenant desde DB. |
| **V1-10** | Botones solo mostraban toast | **ABIERTO** | `client/src/pages/Home.tsx:209` | Conectar botones con acciones reales. |
| **V1-11** | `Page 1`, `Page 2`, `/some-path` huérfanos | **ABIERTO** | `client/src/components/DashboardLayout.tsx:31-32` | Eliminar componentes y enlaces huérfanos. |
| **V1-12** | Configuración satelital solo en `localStorage` | **ABIERTO** | `client/src/pages/SatelliteConfiguration.tsx:31` | Persistir preferencias satelitales en Supabase DB. |
| **V1-13** | Perfil y cambio de clave no implementados | **ABIERTO** | Rutas inexistentes en `client/src/App.tsx` | Crear vista de Perfil y flujo de cambio de clave. |
| **V1-14** | PDF, GeoJSON y Shapefile simulados | **ABIERTO** | `client/src/components/ReportDownloadActions.tsx:28` | Generar PDF en backend y subir a Storage con URL firmada. |
| **V1-15** | Caché de Copernicus en RAM | **ABIERTO** | `server/copernicus.ts:301` | Persistir caché de observaciones en tabla PostgreSQL. |
| **V1-16** | Tier 3 solo rechazado | **ABIERTO** | `server/routers.ts:121` | Implementar pipeline para Tier 3 regional. |
| **V1-17** | Variable `sst` sobre Sentinel-3 OLCI | **ABIERTO** | `server/copernicus.ts:45` | Mapear `sst` a sensor **SLSTR** de Sentinel-3. |
| **V1-18** | `createAnalysis` síncrono | **ABIERTO** | `server/routers.ts:100` | Procesar solicitudes con worker asíncrono desacoplado. |
| **V1-19** | Informes desde catálogo en memoria | **ABIERTO** | `shared/report-catalog.ts:16` | Persistir y consultar informes en base de datos Postgres. |
| **V1-20** | Bundle `vendor-charts` ~405 kB | **PARCIAL** | `dist/public/assets/vendor-charts-Bt_LSy95.js` | Aplicar lazy-loading más agresivo en gráficos. |
| **V1-21** | Hotfix de `copernicus.test.ts` | **CERRADO** | PR #22 (`937510d`) | Ninguno. Totalmente corregido. |
| **V2-01** | `apiKeys.create` público sin auth | **ABIERTO** | `server/routers.ts:236` | Proteger endpoint con `adminProcedure` y verificar tenant. |
| **V2-02** | Hardcode de Client ID en `env.ts` | **ABIERTO** | `server/_core/env.ts:13` | Eliminar fallback hardcodeado y requerir variable de entorno. |
| **V2-03** | Falta de Helmet y Rate Limiting | **ABIERTO** | `server/app.ts` | Agregar middlewares de seguridad en Express. |
| **V2-04** | Vulnerabilidades en dependencias core | **ABIERTO** | `pnpm audit` (164 vulns / 92 prod) | Actualizar dependencias vulnerables (`express`, `body-parser`). |

---

## Plan Siguiente Priorizado (P0 a P3)

### P0 — Bloqueantes de Seguridad y Multi-Tenant (Esfuerzo: L)
- **Tarea P0.1:** Conectar `createContext` en `server/_core/context.ts` con Supabase Auth para validar el token JWT `Authorization: Bearer` y popular `ctx.user` con `{ userId, tenantId, role }`. *(XS)*
- **Tarea P0.2:** Convertir **todos** los procedimientos tRPC de `server/routers.ts` a `protectedProcedure` o `adminProcedure`. *(S)*
- **Tarea P0.3:** Eliminar la lectura de `planId`, `haMesUsadas` y `prediosActivos` desde el cliente en `analysisInput`. Extraer la suscripción y uso exclusivamente desde Supabase DB. *(S)*
- **Tarea P0.4:** Implementar el Auth Hook Custom Claims en Supabase (`auth.custom_access_token_hook`) para inyectar `tenant_id` y `role` en `app_metadata`. *(S)*

### P1 — Persistencia Real y Desacoplamiento de Worker (Esfuerzo: L)
- **Tarea P1.1:** Migrar `solicitudes_analisis`, `informes`, `predios` y `consumo` de RAM/stubs a consultas reales Supabase en `server/db/repository.ts` respetando RLS. *(L, Dep: P0.1)*
- **Tarea P1.2:** Crear el worker asíncrono `server/services/analysis-worker.ts` para procesar solicitudes en estado `en_cola` de forma desacoplada. *(M, Dep: P1.1)*
- **Tarea P1.3:** Corregir la clave de idempotencia para incluir `tenantId` (`${tenantId}:${idempotencyKey}`) y persistir en `solicitudes_analisis`. *(XS, Dep: P1.1)*

### P2 — Corrección del Motor Copernicus y Exportaciones (Esfuerzo: M)
- **Tarea P2.1:** Corregir el mapeo de la variable `sst` de Sentinel-3 OLCI a **Sentinel-3 SLSTR** (`sentinel-3-slstr`) en `server/copernicus.ts`. *(S)*
- **Tarea P2.2:** Reemplazar el fallback silencioso de `FallbackObservationProvider` por una notificación explícita de fallo en el informe. *(S)*
- **Tarea P2.3:** Implementar generación real de PDF con PDFKit y almacenamiento en Supabase Storage con URLs firmadas de corta duración. *(M, Dep: P1.1)*

### P3 — Limpieza de Código, UI y Endurecimiento (Esfuerzo: S)
- **Tarea P3.1:** Eliminar archivos huérfanos (`DashboardLayout.tsx`, `ComponentShowcase.tsx`) y corregir navegación en `App.tsx`. *(XS)*
- **Tarea P3.2:** Agregar middlewares de Express (`helmet`, `express-rate-limit`) en `server/app.ts`. *(XS)*
- **Tarea P3.3:** Actualizar dependencias vulnerables (`pnpm audit fix`). *(S)*

---

## Veredicto Final

**NO LISTO** (Bloqueantes: procedimientos tRPC 100% públicos sin auth en backend; desacoplamiento total entre runtime y Supabase Postgres; elusión de cuotas/planes por inyección de parámetros del cliente; fallback silencioso a datos sintéticos; e imprecisión técnica en variable `sst` sobre Sentinel-3 OLCI).
