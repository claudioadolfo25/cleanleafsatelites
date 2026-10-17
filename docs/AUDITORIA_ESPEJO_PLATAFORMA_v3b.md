# Informe de Auditoría Espejo de la Plataforma v3b (Cleanleaf / AgroPulso)

**Fecha de ejecución:** 17 de Octubre de 2026
**Rama evaluada:** `feat/supabase-auth-trpc-bridge-1239414039099083708` (commit HEAD `411f370986774aa747d21f0c7b761b2ea58679d7`)
**Autor:** Jules (Software Engineer Agent)
**Estado de modificación del código fuente:** SIN CAMBIOS EN CÓDIGO FUENTE / SOLO LECTURA (único archivo creado: `docs/AUDITORIA_ESPEJO_PLATAFORMA_v3b.md`).

---

## Paso 0: Documentación de la Línea Base Real de la Rama

### 1. Hash de Git y Diff con `origin/main`
- **`git rev-parse HEAD`:** `411f370986774aa747d21f0c7b761b2ea58679d7`
- **Diff con `origin/main` (`git diff --stat origin/main...HEAD`):**
  - **48 archivos modificados**, 7,234 inserciones (+), 1,689 eliminaciones (-).
  - Archivos creados clave: `server/db/repository.ts` (1,544 líneas), `server/services/analysis-worker.ts` (352 líneas), `server/reports/pdf-service.ts` (173 líneas), `server/geometry.ts` (137 líneas), `client/src/pages/AdminDashboardPage.tsx` (176 líneas), `client/src/pages/PrediosPage.tsx` (316 líneas), `client/src/pages/ProfilePage.tsx` (317 líneas), `supabase/migrations/003` a `009`.

### 2. Comandos de Construcción, Pruebas y Auditoría
- **`pnpm install --frozen-lockfile`:** Exitoso (19 paquetes añadidos/verificados, `pdfkit 0.20.2`).
- **`pnpm check` (`tsc --noEmit`):** Exitoso (**0 errores de TypeScript**).
- **`pnpm test` (`vitest run`):**
  - **Resultados:** **6 archivos de prueba pasados de 6**, **97 pruebas pasadas de 97** (comparado con 48 tests en v2/main, un incremento de **49 pruebas unitarias e integración nuevas**).
  - Archivos ejecutados:
    1. `server/app.test.ts`: **52 tests pasados**
    2. `server/satellite-domain.test.ts`: **27 tests pasados**
    3. `server/copernicus.test.ts`: **13 tests pasados**
    4. `server/catalog-client.test.ts`: **2 tests pasados**
    5. `server/fase1-auth-config.test.ts`: **2 tests pasados**
    6. `server/auth.logout.test.ts`: **1 test pasado**
- **`pnpm build` (`vite build && esbuild`):** Exitoso.
  - Servidor (`dist/index.js`): **174.1 kB** (vs 83.3 kB en main).
  - Cliente (`dist/public/`): Bundle principal `index-Bkw39aQa.js` (**502.47 kB**), `vendor-charts-C9inf4D6.js` (**404.70 kB**), `vendor-radix` (**116.50 kB**), `Home` (**58.37 kB**), Chunks dinámicos para `AdminDashboardPage`, `PrediosPage`, `ProfilePage`, `ResetPasswordPage`, `ReportDetail`.
- **`pnpm audit --prod` (solo dependencias de producción):**
  - **92 vulnerabilidades detectadas** (12 LOW, 55 MODERATE, 23 HIGH, 2 CRITICAL).
  - Vulnerabilidad crítica destacada: `express@4.21.2` dependiente de `body-parser@1.20.3` (`GHSA-v422-hmwv-36x6` - DoS en parseo de cuerpos HTTP).
- **Estado del CI:**
  - Definido en `.github/workflows/ci.yml` y `.github/workflows/staging-copernicus-smoke.yml`.

---

## Verificación de Existencia de Módulos y Código Heredado

### Módulos Requeridos (SÍ / NO)

| Módulo / Archivo | Existe | Ruta Exacta en la Rama |
| --- | --- | --- |
| `server/db/repository.ts` | **SÍ** | `server/db/repository.ts` |
| `server/geometry.ts` | **SÍ** | `server/geometry.ts` |
| `server/services/analysis-worker.ts` | **SÍ** | `server/services/analysis-worker.ts` |
| `server/worker.ts` | **SÍ** | `server/worker.ts` |
| `server/services/copernicus-policy-service.ts` | **SÍ** | `server/services/copernicus-policy-service.ts` |
| `server/services/copernicus-time-series-service.ts` | **SÍ** | `server/services/copernicus-time-series-service.ts` |
| `server/services/copernicus-scenes-service.ts` | **SÍ** | `server/services/copernicus-scenes-service.ts` |
| `server/services/copernicus-thumbnail-service.ts` | **SÍ** | `server/services/copernicus-thumbnail-service.ts` |
| `server/reports/*` | **SÍ** | `server/reports/pdf-service.ts`, `report-view-model.ts`, `storage-service.ts` |
| `server/analysis/interpret.ts` | **SÍ** | `server/analysis/interpret.ts`, `recommendation-rules.json` |
| `client/src/pages/AdminDashboardPage.tsx` | **SÍ** | `client/src/pages/AdminDashboardPage.tsx` |
| `supabase/migrations/*` | **SÍ** | `supabase/migrations/003_auth_hook_and_idempotency.sql` a `009_escenas_and_informe_escenas.sql` |

### Ausencia o Presencia de Componentes y Librerías

- **`server/copernicus/` (Directorio):** **NO** (El código de Copernicus está consolidado en `server/copernicus.ts`).
- **`interface CopernicusEngine`:** **NO** (La interfaz oficial es `EarthObservationProvider` en `shared/observation-provider.ts`).
- **`tabla copernicus_requests`:** **NO** (La tabla oficial es `solicitudes_analisis` en `supabase/schema.sql`).
- **Dependencia `helmet`:** **NO** (no instalada en `package.json`).
- **Dependencia `express-rate-limit`:** **NO** (en `server/app.ts:7-35` se utiliza un mapa en memoria custom `rateLimitMap`).
- **Dependencias `pino`, `cors`, `docx`:** **NO** (no están en `package.json`).
- **Restos de Manus / Drizzle / MySQL:** **PARCIAL / SÍ**.
  Archivos `drizzle/`, `drizzle.config.ts`, `server/db.ts` y las llamadas a `db` en `server/_core/sdk.ts` siguen presentes para la capa de autenticación heredada. Sin embargo, todas las operaciones de la plataforma Cleanleaf (`cleanleaf.*`, `predios.*`, `reports.*`) fueron redirigidas a `server/db/repository.ts` usando `@supabase/supabase-js`.

---

## Verificación Explícita de los 15 Riesgos Específicos

### 1. LECTURA DE `tenantId` Y `role`
- **Ubicación:** `server/_core/context.ts:40-41` y líneas `63-64`.
  - Línea 40: `tenantId: (appMeta.tenant_id || userMeta.tenant_id || appMeta.tenantId || userMeta.tenantId || u.id) as string`
  - Línea 41: `role: (appMeta.role || userMeta.role || "user") as string`
- **Riesgo Identificado (ALTO):** Prioriza `app_metadata` (inyectado por el Auth Hook), pero mantiene fallbacks a `user_metadata`. Un usuario malicioso podría incluir `user_metadata.tenant_id` en el registro si el Hook de Auth no está instalado en Supabase.

### 2. FALLBACK DE `jose.jwtVerify`
- **Ubicación:** `server/_core/context.ts:50-52`.
  ```ts
  const jwtSecret =
    process.env.SUPABASE_JWT_SECRET ||
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "test" ? "test-jwt-secret-12345678901234567890" : "");
  ```
- **Riesgo Identificado (MEDIO):** Cae a `JWT_SECRET` heredado de Manus si `SUPABASE_JWT_SECRET` no está configurado en el entorno.

### 3. ACCESO EN `adminProcedure` Y FILTRADO MULTI-TENANT
- **Ubicación:** `server/_core/trpc.ts:34` y `server/routers.ts:712-740`.
  - `server/_core/trpc.ts:34`: `if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'owner' && ctx.user.role !== 'super_admin'))`
  - `server/routers.ts:712`: `listTenants` invoca `listAllTenantsDb(accessToken)`.
- **Riesgo Identificado (CRÍTICO):** `listTenants` permite a cualquier usuario con rol `admin` listar TODOS los tenants del sistema sin filtrar por su `tenant_id`. Asimismo, `updatePlan` (`server/routers.ts:716`) permite a un `admin` de un tenant modificar el plan de cualquier otro tenant enviando su `tenantId` en el body.

### 4. CLIENTE SUPABASE EN EL WORKER ASÍNCRONO
- **Ubicación:** `server/services/analysis-worker.ts:289` y `server/db/supabase-client.ts:3-23`.
  - `runWorkerIteration(accessToken?: string)` se invoca en `startWorkerLoop()` sin pasar `accessToken`.
  - `getSupabaseUserClient(undefined)` inicializa el cliente con `SUPABASE_ANON_KEY` sin cabecera Bearer JWT.
- **Riesgo Identificado (CRÍTICO):** El worker en segundo plano se ejecuta anónimamente. Las consultas a `solicitudes_analisis` con RLS `tenant_id = get_current_tenant_id()` fallarán o no devolverán filas a menos que el worker utilice `SUPABASE_SERVICE_ROLE_KEY` o un token de sistema.

### 5. FALLBACK SINTÉTICO EN PRODUCCIÓN Y `getIndexTimeSeries`
- **Ubicación:** `server/services/analysis-worker.ts:22-31`.
  - Si `COPERNICUS_MODE !== "live"`, se asigna `SyntheticCopernicusProvider`.
  - Si `copernicusLiveEnabled` es true, `FallbackObservationProvider` captura excepciones de CDSE y cae a datos sintéticos.
- **Población de `observaciones_serie`:** `analysis-worker.ts:135` lee de `observaciones_serie`, pero no invoca `getIndexTimeSeries` para poblar automáticamente la serie histórica en la base de datos durante la ejecución del worker. `getIndexTimeSeries` se invoca exclusivamente bajo demanda vía el procedimiento tRPC `cleanleaf.getTimeSeries`.

### 6. SUBIDA DE MINIATURA DE PREDIOS Y TIPO MIME
- **Ubicación:** `server/services/copernicus-thumbnail-service.ts:18` y `server/reports/storage-service.ts:18`.
  ```ts
  const storagePath = await uploadReportPdfToStorage(tenantId, `${solicitudId}-thumb`, mockImageBuffer, accessToken);
  ```
- **Riesgo Identificado (ALTO):** `uploadReportPdfToStorage` sube el buffer de la imagen con extensión `.pdf` y cabecera `contentType: "application/pdf"`, corrompiendo la miniatura PNG/JPEG en Supabase Storage.

### 7. IDEMPOTENCIA Y EJECUCIÓN DE MIGRACIONES `003` A `009`
- **Ubicación:** `supabase/migrations/003_*.sql` a `009_*.sql`.
- **Verificación:** Todas las sentencias utilizan `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` y `CREATE POLICY`. Son 100% idempotentes y ejecutables sobre un esquema limpio.

### 8. COLUMNAS DE INFORMES, EXPORTACIÓN WORD Y SHAPEFILE
- **Columnas `pdf_path`, `pdf_sha256`, `pdf_version`:** **NO** existen en `supabase/schema.sql` ni en las migraciones.
- **Exportación Word:** `client/src/components/ReportDownloadActions.tsx:112` genera un string HTML plano con extensión `.doc` y MIME `application/msword`. **NO es un archivo binario `.docx` real**.
- **Exportación Shapefile:** **NO IMPLEMENTADO**. No existe lógica ni librería para generar Shapefiles (`.shp`).

### 9. AUTENTICACIÓN DE API KEYS Y SCOPES
- **Ubicación:** `supabase/migrations/005_api_keys_and_tenants.sql` y `server/db/repository.ts:919`.
- **Riesgo Identificado (ALTO):** No existe ningún middleware o handler HTTP que autentique peticiones entrantes leyendo la cabecera `X-API-Key` contra la tabla `api_keys`. No existen scopes asignados a las claves API.

### 10. RATE LIMITING EN EXPRESS
- **Ubicación:** `server/app.ts:7-35`.
- **Implementación:** `createInMemoryRateLimiter` utiliza un `Map` en memoria (`rateLimitMap`). La clave de limitación es `${req.path}:${ip}`. Se aplica estrictamente **por IP y por ruta** (300 req/min general, 20 req/min en `createAnalysis`). No limita por usuario ni por tenant.

### 11. VALIDACIÓN DE VARIABLES DE ENTORNO Y CORS
- **Validación de env al arrancar:** `server/admin/supabase-client.ts:11` lanza un `Error` explícito en arranque si faltan `SUPABASE_URL`, `SUPABASE_ANON_KEY` o `SUPABASE_SERVICE_ROLE_KEY` fuera del entorno de tests.
- **CORS:** `server/app.ts:40-46` configura cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`), pero no instala la librería `cors` para restringir orígenes cruzados explícitos.

### 12. ESTADOS DE SOLICITUD EN WORKER VS ESQUEMA
- **Esquema (`supabase/schema.sql`):** `check (estado in ('borrador', 'pendiente', 'en_cola', 'procesando', 'completado', 'error_reintentable', 'error_final', 'requiere_revision', 'cancelado', 'rechazada_catalogo', 'rechazada_plan'))`
- **Worker (`server/services/analysis-worker.ts`):** `pendiente` -> `en_cola` -> `procesando` -> `completado` / `error_final` / `requiere_revision`. Coincide 100% con la restricción del esquema.

### 13. TESTS DE AISLAMIENTO MULTI-TENANT Y MOCKS
- **Ubicación:** `server/app.test.ts:750-850`.
- **Verificación:** Los tests de aislamiento en `server/app.test.ts` son pasados utilizando mocks de sesión y repositorio en memoria dentro de Vitest. No conectan con una instancia viva de Supabase Postgres.

### 14. INYECCIÓN DE PROMPTS Y TEXTOS DE USUARIO SIN SANITIZAR
- **Riesgo Identificado (MEDIO):** Textos provistos por el usuario como `predioNombre` u `organizationName` son insertados directamente en las plantillas de vectorización PDF (`server/reports/pdf-service.ts`) y en los mensajes de correo (`server/services/notification-service.ts`). Aunque PDFKit renderiza vectores sin riesgo de ejecución HTML, en las notificaciones por correo los textos deben ser escapados.

### 15. PREPARACIÓN AGÉNTICA ACTUALIZADA
1. **¿Lógica de negocio en capa de servicios con contexto explícito?** **SÍ**. Lógica migrada a `server/db/repository.ts` y `server/services/*` recibiendo `tenantId` y `accessToken`.
2. **¿Distinción de actor en logs?** **PARCIAL**. `audit_logs` registra `user_id`, `user_email`, `action`, `payload`, pero falta campo `actor_type` ('agent' vs 'user').
3. **¿API keys con scopes, hash y auditoría?** **PARCIAL**. Se almacena `key_hash` en DB, pero falta middleware de autenticación por API key.
4. **¿Errores tipados y estables?** **SÍ**. Errores tipados en Copernicus, tRPC TRPCError con códigos estables.
5. **¿Presupuesto por tenant para cuota de CDSE?** **PARCIAL**. `consumo` registra hectáreas procesadas, pero falta bloqueo duro automático al alcanzar el límite del plan.

---

## 1. Resumen Ejecutivo y Veredicto (Sección 1)

### Qué mejoró sustancialmente en esta rama:
- **Autenticación e Integración Supabase JWT:** `server/_core/context.ts` valida el token Bearer JWT de Supabase extraído de los encabezados HTTP.
- **Persistencia Real Multi-tenant:** `server/db/repository.ts` conecta las entidades `solicitudes_analisis`, `informes`, `mediciones`, `consumo`, `predios`, `user_preferences`, `tenant_settings`, `audit_logs` y `workflow_logs` con Supabase Postgres haciendo cumplir RLS por `tenant_id`.
- **Worker Asíncrono Desacoplado:** `server/services/analysis-worker.ts` implementa la máquina de estados, retardo exponencial en retries, registro de logs en `workflow_logs` y deduplicación de alertas agronómicas.
- **Generación Real de PDF y Storage:** `server/reports/pdf-service.ts` genera informes vectoriales con PDFKit y los sube a Supabase Storage emitiendo URLs firmadas de 60 segundos con validación de tenant.
- **Cierre de Procedimientos tRPC:** Todos los procedimientos en `server/routers.ts` (salvo 4 públicos explícitos: `system.health`, `apiV1.health`, `cleanleaf.catalog`, `cleanleaf.configStatus`) fueron convertidos a `protectedProcedure`.
- **Ampliación de Cobertura de Pruebas:** **97 tests pasados** (49 pruebas nuevas).

### Qué sigue mal y requiere atención inmediata:
- **Vulnerabilidad en `adminProcedure`:** `listTenants` y `updatePlan` permiten a un administrador de un tenant listar y alterar planes de otros tenants.
- **Ejecución Anónima del Worker:** `startWorkerLoop()` ejecuta la iteración del worker sin token JWT Bearer ni Service Role Key, fallando ante consultas protegidas por RLS.
- **MIME Type en Subida de Miniatura:** `getFieldThumbnail` sube imágenes PNG usando `uploadReportPdfToStorage` con extensión `.pdf` y `contentType: "application/pdf"`.
- **Falta de Middleware de Autenticación para API Keys.**

---

## 11. Matriz de Cierre y Diagnóstico Final

### Matriz de Cierre de los 25 Hallazgos de v2 (21 de v1 + 4 Nuevos de v2)

| ID | Hallazgo Original v2 | Estado Actual | Evidencia Exacta (Archivo:Línea) | Qué Falta para Cerrar |
| --- | --- | --- | --- | --- |
| **V1-01** | `cleanleaf.dashboard` público por defecto | **CERRADO** | `server/routers.ts:184` usa `protectedProcedure` | Ninguno. |
| **V1-02** | Resto de procedimientos tRPC públicos | **CERRADO** | `server/routers.ts:175-740` reducidos a `protectedProcedure` | Ninguno. |
| **V1-03** | Autenticación dual (Supabase vs cookie Manus) | **CERRADO** | `server/_core/context.ts:20` valida token JWT Supabase | Ninguno. |
| **V1-04** | `planId` y `haMesUsadas` tomados del cliente | **CERRADO** | `server/routers.ts:216` deriva uso y plan desde DB | Ninguno. |
| **V1-05** | `idempotencyStore` en RAM y clave sin tenant | **CERRADO** | `server/routers.ts:216` y `supabase/migrations/003` | Ninguno. |
| **V1-06** | Test de `app.test.ts` valida dashboard público | **CERRADO** | `server/app.test.ts:28` exige token Bearer | Ninguno. |
| **V1-07** | BBOX por defecto fijo en Araucanía | **CERRADO** | `server/geometry.ts` calcula BBOX dinámico | Ninguno. |
| **V1-08** | Fallback sintético silencioso | **PARCIAL** | Tagged con `data_source: "synthetic"` | Notificar explícitamente en UI cuando se activa fallback. |
| **V1-09** | Textos hardcodeados en Home | **CERRADO** | `client/src/pages/Home.tsx` consume `cleanleaf.dashboard` real | Ninguno. |
| **V1-10** | Botones solo mostraban toast | **CERRADO** | `client/src/pages/Home.tsx` conecta con acciones reales | Ninguno. |
| **V1-11** | `Page 1`, `Page 2`, `/some-path` huérfanos | **CERRADO** | `client/src/pages/ComponentShowcase.tsx` eliminado | Ninguno. |
| **V1-12** | Configuración satelital solo en `localStorage` | **CERRADO** | Migrado a `tenant_settings` / `user_preferences` | Ninguno. |
| **V1-13** | Perfil y cambio de clave no implementados | **CERRADO** | `ProfilePage.tsx` y `ResetPasswordPage.tsx` creados | Ninguno. |
| **V1-14** | PDF, GeoJSON y Shapefile simulados | **PARCIAL** | PDF con PDFKit y GeoJSON reales; Word/Shapefile siguen parciales | Implementar exportador binario `.docx` real. |
| **V1-15** | Caché de Copernicus en RAM | **CERRADO** | `007_observation_cache_and_quality.sql` en Postgres | Ninguno. |
| **V1-16** | Tier 3 solo rechazado | **CERRADO** | Tier 3 entra en estado `requiere_revision` en DB | Ninguno. |
| **V1-17** | Variable `sst` sobre Sentinel-3 OLCI | **CERRADO** | Restricted a `sentinel-3-slstr` | Ninguno. |
| **V1-18** | `createAnalysis` síncrono | **CERRADO** | Solicitud en estado `pendiente`, procesada por worker | Ninguno. |
| **V1-19** | Informes desde catálogo en memoria | **CERRADO** | `server/db/repository.ts` lee de `informes` en Postgres | Ninguno. |
| **V1-20** | Bundle `vendor-charts` ~405 kB | **PARCIAL** | `vendor-charts` (404.70 kB); lazy loading aplicado en páginas | Optimizar chunkeado de recharts. |
| **V1-21** | Hotfix de `copernicus.test.ts` | **CERRADO** | `server/copernicus.test.ts` (13/13 pasados) | Ninguno. |
| **V2-01** | `apiKeys.create` público sin auth | **CERRADO** | Convertido a `protectedProcedure` en `server/routers.ts` | Ninguno. |
| **V2-02** | Hardcode de Client ID en `env.ts` | **CERRADO** | `server/_core/env.ts` maneja fallback seguro | Ninguno. |
| **V2-03** | Falta de Helmet y Rate Limiting | **CERRADO** | Cabeceras de seguridad y rate limit en `server/app.ts:7-46` | Usar Redis/Upstash para rate limit distribuido. |
| **V2-04** | Vulnerabilidades en dependencias core | **ABIERTO** | `pnpm audit --prod` (92 vulns en prod) | Actualizar `express` a >=4.21.3 o v5. |

---

### Hallazgos Nuevos Introducidos en Esta Rama (Severidad)

1. **`admin.listTenants` y `admin.updatePlan` permiten escalación multi-tenant entre administradores (SEVERIDAD: CRÍTICA)**
   - *Evidencia:* `server/routers.ts:712-730`. `listTenants` no filtra por `ctx.user.tenantId`, permitiendo a un admin de un tenant listar todas las organizaciones de la plataforma y cambiar el plan de cualquier tenant.
2. **Worker asíncrono ejecuta iteración en modo anónimo sin token JWT (SEVERIDAD: CRÍTICA)**
   - *Evidencia:* `server/services/analysis-worker.ts:289` invoca `getPendingSolicitudesDb(undefined)` sin pasar un token JWT o Service Role Key.
3. **MIME type y extensión corruptos al subir miniatura de predios (SEVERIDAD: ALTA)**
   - *Evidencia:* `server/services/copernicus-thumbnail-service.ts:18` sube la miniatura llamando a `uploadReportPdfToStorage`, guardándola con extensión `.pdf` y `contentType: "application/pdf"`.

---

## Plan Siguiente Priorizado (P0 a P3)

### P0 — Correcciones Críticas de Seguridad y Worker (Esfuerzo: S)
- **Tarea P0.1:** Restringir `admin.listTenants` y `admin.updatePlan` en `server/routers.ts` para exigir rol `super_admin` o filtrar estrictamente por `ctx.user.tenantId`. *(XS)*
- **Tarea P0.2:** Configurar `analysis-worker.ts` para utilizar `SUPABASE_SERVICE_ROLE_KEY` al consultar la base de datos en segundo plano. *(XS)*
- **Tarea P0.3:** Crear la función de subida `uploadImageToStorage` con `contentType: "image/png"` en `storage-service.ts` para miniaturas. *(XS)*

### P1 — Middleware de API Keys y Exportaciones Binarias (Esfuerzo: M)
- **Tarea P1.1:** Implementar middleware de autenticación para la cabecera `X-API-Key` leyendo desde la tabla `api_keys`. *(S)*
- **Tarea P1.2:** Reemplazar el exportador Word de string HTML por una librería de generación de archivos binarios `.docx`. *(M)*

### P2 — Rate Limiting Distribuido y Actualización de Dependencias (Esfuerzo: S)
- **Tarea P2.1:** Actualizar dependencias de producción en `package.json` para mitigar la vulnerabilidad DoS de `express` / `body-parser`. *(S)*
- **Tarea P2.2:** Configurar almacenamiento distribuido para el rate limit de Express. *(S)*

### P3 — Optimización de Bundles Frontend (Esfuerzo: XS)
- **Tarea P3.1:** Aplicar code-splitting dinámico en el módulo `recharts` de `vendor-charts`. *(XS)*

---

## Veredicto Final

**LISTO CON RESERVAS** (Reservas: 1. `admin.listTenants` y `updatePlan` deben restringirse a `super_admin` antes de producción; 2. El worker en segundo plano debe configurarse con `SUPABASE_SERVICE_ROLE_KEY` para operar con RLS activo; 3. La subida de miniatura debe utilizar MIME type `image/png`).
