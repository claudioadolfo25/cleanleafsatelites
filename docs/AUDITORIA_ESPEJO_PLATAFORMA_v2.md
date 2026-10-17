# Informe de Auditoría Espejo de la Plataforma v2 (Cleanleaf / AgroPulso)

**Fecha de ejecución:** 17 de Octubre de 2026
**Rama evaluada:** `main` (commit HEAD `937510d`)
**Autor:** Jules (Software Engineer Agent)
**Estado de modificación del código fuente:** SIN CAMBIOS EN CÓDIGO FUENTE / SOLO LECTURA (único archivo creado: `docs/AUDITORIA_ESPEJO_PLATAFORMA_v2.md`).

---

## Resultados Comprobatorios de Comandos de Construcción y Pruebas

Los comandos requeridos por la norma de ingeniería fueron ejecutados en la raíz de la plataforma con los siguientes resultados exactos:

1. **`pnpm install --frozen-lockfile`**
   - **Resultado:** Exitoso (783 paquetes instalados/verificados en 11.4s).
   - **Advertencia:** Engine mismatch: `wanted: {"node":"20.x"}`, runtime en sandbox `node v22.22.1`.

2. **`pnpm check` (`tsc --noEmit`)**
   - **Resultado:** Exitoso (**0 errores de TypeScript**).

3. **`pnpm test` (`vitest run`)**
   - **Resultado:** Exitoso (**6 archivos de pruebas pasados, 48 pruebas pasadas de 48**).
   - **Suites ejecutadas:**
     - `server/catalog-client.test.ts`: 2 passed
     - `server/copernicus.test.ts`: 13 passed
     - `server/satellite-domain.test.ts`: 27 passed
     - `server/auth.logout.test.ts`: 1 passed
     - `server/fase1-auth-config.test.ts`: 2 passed
     - `server/app.test.ts`: 3 passed

4. **`pnpm build` (`vite build && esbuild`)**
   - **Resultado:** Exitoso.
   - **Bundles producidos en `dist/`:**
     - Servidor (`dist/index.js`): **83.3 kB**
     - Cliente (`dist/public/`):
       - `index.html`: 368.11 kB (gzip: 105.62 kB)
       - `assets/index-PjVLM58D.css`: 141.53 kB
       - `assets/index-cg7ISrE_.js` (Bundle Principal): **499.74 kB** (gzip: 144.68 kB)
       - `assets/vendor-charts-Bt_LSy95.js`: **404.70 kB** (gzip: 111.96 kB)
       - `assets/vendor-radix-DPNxtLY_.js`: 95.50 kB
       - `assets/vendor-query-qI_mU3dF.js`: 83.22 kB
       - `assets/vendor-icons-ByKkt5aN.js`: 24.65 kB
       - Varios Chunks de páginas (`Home`, `SatelliteConfiguration`, `ReportsDashboard`, `ReportDetail`, `AuthPage`, `LandingPage`): entre 2 kB y 50 kB.

5. **`pnpm audit`**
   - **Resultado:** **164 vulnerabilidades detectadas** (13 LOW, 86 MODERATE, 59 HIGH, 6 CRITICAL).
   - **Hallazgos críticos clave:**
     - `express@4.21.2` dependiente de `body-parser@1.20.3` (`GHSA-v422-hmwv-36x6`).
     - Vulnerabilidades en `axios`, `jose`, `drizzle-kit`, `mermaid`/`dompurify` vía `streamdown`.

---

## 1. Resumen Ejecutivo y Veredicto

### Qué mejoró respecto a v1:
- Se corrigió la sintaxis defectuosa en `server/copernicus.test.ts` (línea 173) en el hotfix #22, restaurando la ejecución del 100% de la suite de pruebas (48/48 pasadas).
- Se implementó el soporte del cliente OAuth2 CDSE Tellus en `server/copernicus.ts` con manejo tipado de errores (`CopernicusAuthError`, `CopernicusRateLimitError`, `CopernicusTimeoutError`).
- Se añadió un pipeline CI en `.github/workflows/ci.yml` que ejecuta `pnpm check`, `pnpm test`, `pnpm build` y una auditoría de exposición de secretos en el diff.
- Se agregaron esquemas de tablas en `supabase/schema.sql` con políticas RLS para aislamiento multi-tenant.

### Qué sigue mal y bloquea producción:
- **Backend desacoplado de Supabase Auth y Postgres:** Todo el runtime de `server/routers.ts` sigue operando sobre estructuras en memoria (`idempotencyStore` Map, `demoDashboard`, `demoReports`). Ningún procedimiento tRPC consulta ni persiste datos en Supabase Postgres.
- **Autenticación dual e inseguridad en tRPC:** Todos los procedimientos tRPC en `server/routers.ts` están expuestos mediante `publicProcedure`. No existe `protectedProcedure` ni verificación de JWT de Supabase en `server/_core/context.ts` (sigue usando el SDK heredado de Manus con `manus-cookie` HS256).
- **Control de límites en manos del cliente:** El procedimiento `cleanleaf.createAnalysis` y `apiV1.solicitudes.create` aceptan `planId`, `haMesUsadas` y `prediosActivos` enviados directamente en el payload del cliente (`analysisInput`), permitiendo la elusión total de límites de uso.
- **Simulación de exportación de informes:** Los botones de exportación a PDF (`window.print()`), Word (HTML estático) y la falta total de GeoJSON/Shapefile en `ReportDownloadActions.tsx` siguen siendo stubs de cliente sin URLs firmadas de Supabase Storage.
- **Procesamiento de análisis síncrono:** Las solicitudes de análisis ejecutan la consulta a Copernicus de forma síncrona dentro del handler de la mutación tRPC. No existe worker asíncrono ni cola de trabajos.

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
  La ruta `/some-path` es un **enlace muerto** que conduce a un 404. Además, el componente `DashboardLayout` no es importado por ninguna página del flujo productivo.
- **`ComponentShowcase.tsx` (Huérfano):** Ubicado en `client/src/pages/ComponentShowcase.tsx`. Es un archivo de showcase de componentes UI que no está registrado en el router de `App.tsx`.
- **Rutas no implementadas:**
  - `/dashboard/admin` (**NO IMPLEMENTADO**): No existe ruta ni componente en el frontend para administración.
  - `/dashboard/perfil` (**NO IMPLEMENTADO**): No existe página de perfil de usuario.
  - `/auth/restablecer-password` (**NO IMPLEMENTADO**): No existe flujo de recuperación o cambio de contraseña.

---

## 3. Autenticación y Sesión

- **Verificación de JWT de Supabase en Backend:** **MOCK / NO IMPLEMENTADO**.
  *Evidencia:* En `server/_core/context.ts:16`, la función `createContext` invoca `sdk.authenticateRequest(opts.req)`. En `server/_core/sdk.ts:182-243`, `authenticateRequest` únicamente parsea la cookie `manus-cookie` (o token Bearer) y verifica una firma JWT HS256 con `ENV.cookieSecret` (`JWT_SECRET`) buscando campos `openId`, `appId`, `name`. No interactúa con `@supabase/supabase-js`, no verifica la clave pública/secreta de Supabase ni extrae el `tenant_id` o `user_id` de la sesión de Supabase.
- **Sistema de Cookies Heredado:** **REAL**.
  *Evidencia:* `shared/const.ts:1` (`COOKIE_NAME = "manus-cookie"`), `server/_core/cookies.ts:14`, y `client/src/main.tsx:51` (`sessionStorage.getItem("manus-cookie")`).
- **Logout:** **PARCIAL**.
  *Evidencia:* El procedimiento `auth.logout` en `server/routers.ts:176` elimina la cookie `manus-cookie` (`ctx.res.clearCookie(COOKIE_NAME)`), pero no revoca la sesión en Supabase (`supabase.auth.signOut()`).
- **Reset y Cambio de Contraseña:** **NO IMPLEMENTADO**. No existen procedimientos tRPC ni interfaces de usuario para restablecer o cambiar contraseñas.
- **Perfil de Usuario:** **NO IMPLEMENTADO**.

---

## 4. Autorización y Aislamiento Multi-tenant

### Tabla Completa de Procedimientos tRPC

| Procedimiento | Nivel de Acceso | Origen de `tenantId` | Riesgo / Observación |
| --- | --- | --- | --- |
| `system.health` | `publicProcedure` | N/A | Ninguno (Health check del sistema) |
| `system.notifyOwner` | `adminProcedure` | N/A | Requiere rol implícito en contexto heredado |
| `auth.me` | `publicProcedure` | Contexto heredado (`ctx.user`) | Devuelve usuario de la cookie Manus |
| `auth.logout` | `publicProcedure` | Contexto req/res | Borra cookie heredada |
| `cleanleaf.dashboard` | `publicProcedure` | N/A | **Crítico:** Si `DEMO_PUBLIC_DASHBOARD !== "false"` (por defecto `true` en `server/routers.ts:184`), es 100% público sin auth |
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

### Manipulación de Parámetros desde el Cliente
*Evidencia:* `server/routers.ts:63-76` (`analysisInput` schema):
```ts
planId: planSchema.default("piloto"),
haMesUsadas: z.number().nonnegative().default(0),
prediosActivos: z.number().int().nonnegative().default(1),
```
Cualquier cliente puede enviar `{ haMesUsadas: 0, planId: "region_completa" }` en la petición JSON y saltarse completamente cualquier límite de cuota o restricción de plan.

### Uso de Service Role vs. Cliente JWT y RLS
- El backend en `server/` **no ejecuta consultas a la base de datos de Supabase**. Usa Drizzle con MySQL (`server/db.ts`) para usuarios del sistema Manus.
- **Verificación de `supabase/schema.sql`:**
  - Las 12 tablas (`tenants`, `planes`, `users`, `predios`, `suscripciones`, `solicitudes_analisis`, `informes`, `mediciones`, `consumo`, `alertas`, `api_keys`, `workflow_logs`) tienen RLS activado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
  - **Políticas faltantes:** No existen políticas RLS definidas para **Supabase Storage Buckets** (no hay sentencias para `storage.objects`).
  - **Hook de Claims faltante:** La función `get_current_tenant_id()` en `supabase/schema.sql:123` intenta leer `current_setting('request.jwt.claims', true)::json ->> 'tenant_id'`. Sin embargo, el código SQL del Auth Hook (`auth.custom_access_token_hook`) para inyectar dicha claim durante el login **NO ESTÁ IMPLEMENTADO** en la migración.

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

### Almacenamiento en Cliente (`localStorage` y `sessionStorage`)
- `localStorage.getItem("cleanleaf-satellite-preferences")`: Guarda preferencias del selector satelital en el navegador (`client/src/pages/SatelliteConfiguration.tsx:31,66`).
- `localStorage.getItem("sidebar-width")`: Guarda ancho del sidebar (`client/src/components/DashboardLayout.tsx:46`).
- `localStorage.getItem("theme")`: Guarda tema UI (`client/src/contexts/ThemeContext.tsx:26`).
- `sessionStorage.getItem("manus-cookie")`: Guarda token de sesión heredado de Manus (`client/src/main.tsx:51`).

### Idempotencia
- **Dónde vive:** En memoria RAM (`const idempotencyStore = new Map<string, unknown>();` en `server/routers.ts:82`). Se pierde completamente ante cualquier reinicio o redespliegue en Render.
- **Composición de la clave:** `server/routers.ts:108`:
  `${input.predioId}:${satellites.join(",")}:${variables.join(",")}:${input.periodFrom ?? "default"}:${input.periodTo ?? "default"}`
  **Falta crítica:** La clave **no incluye `tenantId`**, por lo que un predio con el mismo ID en dos organizaciones diferentes colisionaría en el almacén de idempotencia.

---

## 6. Motor Copernicus

### Estructura y Servicios (`server/copernicus.ts` y `server/stac-client.ts`)
- **Interfaz del Motor:** `EarthObservationProvider` (`shared/observation-provider.ts`).
- **Casos de Uso Implementados:**
  - `CopernicusCDSEProvider.query`: Consulta síncrona a Copernicus Statistical API (`https://sh.dataspace.copernicus.eu/api/v1/statistics`).
  - `CopernicusCDSEProvider.searchCatalog`: Búsqueda en catálogo STAC v1 (`server/stac-client.ts`).
- **Casos de Uso NO Implementados / Incompletos:**
  - `getIndexTimeSeries`: **NO IMPLEMENTADO**.
  - `getProvenance`: **NO IMPLEMENTADO**.
  - `getFieldThumbnail`: **NO IMPLEMENTADO**.
  - `searchScenes`: **PARCIAL** (solo handler onClick en componente UI `CopernicusResourcePanel.tsx`).

### Parámetros de Consulta a Copernicus
- **Geometría:** Usa **BBOX** (`request.bbox ?? [-72.6, -38.7, -72.5, -38.6]` en `server/copernicus.ts:251`). **No envía polígonos GeoJSON** a la Statistical API. Si el cliente no envía BBOX, se aplica un bounding box hardcodeado en La Araucanía.
- **Intervalo de agregación:** Configurado en `"P1D"` (`aggregationInterval.of: "P1D"` en `server/copernicus.ts:233`).
- **Máscara de nubes SCL (Sentinel-2):** En `buildEvalscript` (`server/copernicus.ts:167`), descarta píxeles donde `SCL === 3` (sombra de nubes), `SCL === 8` (nube de media probabilidad) o `SCL === 9` (nube de alta probabilidad).
- **Peticiones por Análisis:** Executa 1 sola petición para el primer satélite y primera variable de la lista solicitada.
- **Actualización incremental y Ledger:** **NO IMPLEMENTADO**.
- **Caché de Copernicus:** Mapa en RAM (`private resultCache = new Map<string, { data: any; expiresAt: number }>()` en `server/copernicus.ts:301`) con TTL de 5 minutos (300,000 ms).
- **Control de Cuotas / Presupuesto por Tenant:** **NO IMPLEMENTADO**.
- **Taxonomía de Errores:** Errores personalizados exportados: `CopernicusAuthError`, `CopernicusRateLimitError`, `CopernicusUnavailableError`, `CopernicusTimeoutError`.
- **Política de Producción (`COPERNICUS_MODE`):**
  - La función `isCopernicusLiveEnabled` en `server/copernicus.ts:40` exige `COPERNICUS_MODE === "live"`, estar en entorno `staging` y contar con credenciales activas.
- **Fallback Silencioso:** **REAL (ABIERTO)**.
  `FallbackObservationProvider` (`server/copernicus.ts:76-88`) captura cualquier excepción devuelta por `liveProvider` y redirige **silenciosamente** a `SyntheticCopernicusProvider`, devolviendo datos inventados deterministas sin notificar una falla al usuario.
- **Estado de la Variable `sst` (Sea Surface Temperature):**
  *Evidencia:* `server/copernicus.ts:45`: `productForSatellite("sentinel-3")` mapea a `"sentinel-3-olci"`.
  **Defecto crítico:** OLCI (Ocean and Land Colour Instrument) es un sensor óptico de clorofila/color del océano, **no mide temperatura de la superficie del mar (SST)**. El sensor adecuado de Sentinel-3 para SST es **SLSTR** (Sea and Land Surface Temperature Radiometer). Además, el evalscript de Sentinel-3 (`buildEvalscript`) lee la banda `B01` (400nm) y la devuelve como si fuera `sst`.

---

## 7. Análisis Asíncrono y Worker

- **Estado de las solicitudes:** Se evalúan síncronamente en `server/routers.ts:100-170`.
- **Worker Process / Colas:** **NO IMPLEMENTADO**. No existe ningún proceso worker (`server/services/analysis-worker.ts`), ni sistema de colas en `package.json` ni en el servidor.
- **Reintentos y Backoff:** El loop en `CopernicusCDSEProvider.query` (`server/copernicus.ts:318-376`) reintenta hasta 2 veces ante HTTP 429 o 5xx con pausas `setTimeout`. Sin embargo, esto ocurre de forma síncrona dentro del ciclo de solicitud HTTP del usuario.
- **Comportamiento ante caída del proceso:** Al no haber persistencia en base de datos ni worker desacoplado, si el servidor cae a mitad de una consulta, la petición del cliente falla inmediatamente con error de conexión y la información se pierde.

---

## 8. Dashboard, Predios e Informes

- **Origen de datos:** **MOCK**.
  - `cleanleaf.dashboard` devuelve el objeto `demoDashboard` (`server/routers.ts:35`).
- **Predios con Geometría:** **MOCK**. La lista de predios se extrae de `demoDashboard.predios`.
- **Cálculo de Hectáreas:** Se toma directamente del valor numérico provisto por el cliente en el payload (`input.hectareas`).
- **Estados Vacíos:** **PARCIAL**. Existen componentes UI (`client/src/components/ui/empty.tsx`), pero la pantalla principal siempre presenta datos hardcodeados.
- **Badge de Procedencia:** **REAL**. Muestra el tipo de fuente (`copernicus_cdse` vs `synthetic`).
- **Interpretación y Alertas:** Las recomendaciones y alertas (`a-1`, `a-2`) son textos estáticos sin cálculos agronómicos dinámicos sobre series de tiempo reales en base de datos.
- **Botones de Exportación (`client/src/components/ReportDownloadActions.tsx`):**
  - **Markdown:** **REAL** (Genera Blob de texto en cliente).
  - **PDF:** **MOCK / PARCIAL** (Invoca `window.print()`, no genera PDFKit ni sube a Supabase Storage).
  - **Word:** **MOCK / PARCIAL** (Descarga un string HTML plano con extensión `.doc`).
  - **GeoJSON:** **NO IMPLEMENTADO** (Inexistente).
  - **Shapefile:** **NO IMPLEMENTADO** (Inexistente).
- **Generación de Informes desde DB sin llamar a Copernicus:** **NO IMPLEMENTADO** (Lee del catálogo estático `shared/report-catalog.ts`).
- **URLs Firmadas en Storage:** **NO IMPLEMENTADO**.
- **Aislamiento Multi-tenant de Informes (404 NOT_FOUND):** **NO IMPLEMENTADO**.
- **Reproducibilidad (Hash de Informe):** **NO IMPLEMENTADO**.

---

## 9. Seguridad y Operación

- **Rate Limiting:** **NO IMPLEMENTADO** en Express (`server/app.ts`). No hay middleware de limitación de tasa de peticiones.
- **Helmet y CORS:** **NO IMPLEMENTADO** en Express (`server/app.ts`).
- **Validación de Variables de Entorno al Arrancar:** **PARCIAL**. `server/_core/env.ts` asigna strings vacíos `""` por defecto a `JWT_SECRET`, `DATABASE_URL`, y `OAUTH_SERVER_URL` sin hacer fallar el arranque del servidor (`fail-fast`).
- **Logging con `correlationId`:** **REAL**. Inyectado en las solicitudes de análisis (`server/routers.ts:107`).
- **Tabla `audit_log`:** **NO IMPLEMENTADO** (no existe en la base de datos ni en middlewares).
- **Panel Administrador:** **NO IMPLEMENTADO** (no hay ruta `/dashboard/admin`).
- **Notificaciones:** **MOCK** (`server/_core/notification.ts`).
- **Health Check:** **REAL** (`GET /api/health` en `server/app.ts:22`, `apiV1.health` en `server/routers.ts:219`).
- **CI / GitHub Actions:** **REAL** (`.github/workflows/ci.yml`).
- **Vulnerabilidades y Secretos:**
  - `pnpm audit` reporta 164 vulnerabilidades.
  - Hardcode de Client ID de Copernicus por defecto en `server/_core/env.ts:13` (`"sh-79ab7ae6-ca8d-4823-90d1-fca2c30fe535"`).

---

## 10. Calidad

- **Cobertura de Tests por Módulo:**
  - `server/copernicus.ts`: Cubierto (`server/copernicus.test.ts` - 13 tests).
  - `shared/satellite-domain`: Cubierto (`server/satellite-domain.test.ts` - 27 tests).
  - `server/app.ts` e integración REST: Cubierto (`server/app.test.ts` - 3 tests).
  - `server/catalog-client.ts`: Cubierto (`server/catalog-client.test.ts` - 2 tests).
  - `server/auth.logout`: Cubierto (`server/auth.logout.test.ts` - 1 test).
  - `server/fase1-auth-config`: Cubierto (`server/fase1-auth-config.test.ts` - 2 tests).
- **Módulos SIN Tests:**
  - Todo el Frontend React en `client/` (**0 tests**).
  - `shared/report-catalog.ts` (**0 tests**).
  - `shared/interpretation.ts` (**0 tests**).
  - `shared/plan-limits.ts` (**0 tests**).
  - `server/storage.ts` y `server/_core/storageProxy.ts` (**0 tests**).
  - Tests de aislamiento multi-tenant RLS (**0 tests**).
- **Rendimiento y Tamaño de Bundles:**
  - Bundle frontend principal: `index-cg7ISrE_.js` (**499.74 kB**).
  - Vendor Charts: `vendor-charts-Bt_LSy95.js` (**404.70 kB**).

---

## 11. Matriz de Cierre y Diagnóstico Final

### Matriz de Cierre de Hallazgos v1

| ID | Hallazgo Original v1 | Estado Actual | Evidencia Exacta (Archivo:Línea / Salida) | Qué Falta para Cerrar |
| --- | --- | --- | --- | --- |
| **V1-01** | `cleanleaf.dashboard` público por defecto y fail-open de `DEMO_PUBLIC_DASHBOARD` | **ABIERTO** | `server/routers.ts:184`: `const isPublic = process.env.DEMO_PUBLIC_DASHBOARD !== "false";` | Cambiar a `protectedProcedure`, exigir sesión obligatoria y eliminar la variable fail-open. |
| **V1-02** | Resto de procedimientos públicos (`reports`, `createAnalysis`, `solicitudes`, `onboarding.createTenant`, `apiKeys.create`) | **ABIERTO** | `server/routers.ts:191,216,221,230,236` usan `publicProcedure` | Convertir todos los procedimientos a `protectedProcedure` o `adminProcedure`. |
| **V1-03** | Autenticación dual (Supabase en frontend vs. cookie heredada en backend) | **ABIERTO** | `server/_core/context.ts:16` invoca `sdk.authenticateRequest` que valida `manus-cookie` HS256 (`server/_core/sdk.ts:182`) | Validar tokens JWT de Supabase en `context.ts` usando la clave de Supabase. |
| **V1-04** | `planId`, `haMesUsadas` y `prediosActivos` tomados del cliente | **ABIERTO** | `server/routers.ts:63-76` (`analysisInput` Zod schema) | Extraer plan, uso y predios activos exclusivamente de la base de datos según el tenant autenticado. |
| **V1-05** | `idempotencyStore` en RAM y clave sin tenant | **ABIERTO** | `server/routers.ts:82` (`const idempotencyStore = new Map()`) y línea 108 (clave sin `tenantId`) | Persistir la idempotencia en tabla Postgres `solicitudes_analisis` con restricción única `(tenant_id, idempotency_key)`. |
| **V1-06** | Test de `app.test.ts` que validaba el dashboard público | **ABIERTO** | `server/app.test.ts:28`: verifica 200 OK en `cleanleaf.dashboard` sin encabezado de autenticación | Actualizar test para requerir token de autenticación válido de Supabase. |
| **V1-07** | BBOX por defecto fijo en Araucanía y predio como texto libre | **ABIERTO** | `server/copernicus.ts:251` (`request.bbox ?? [-72.6, -38.7, -72.5, -38.6]`) | Validar geometría GeoJSON desde la tabla `predios` en DB y calcular su BBOX dinámicamente. |
| **V1-08** | Fallback sintético silencioso y datos sintéticos presentados como reales | **ABIERTO** | `server/copernicus.ts:76-88` (`FallbackObservationProvider` captura error y llama a `SyntheticCopernicusProvider`) | Informar explícitamente el estado degradado al usuario y deshabilitar fallbacks silenciosos en producción. |
| **V1-09** | Textos hardcodeados en Home (fecha, nombre, clima, plan) | **ABIERTO** | `client/src/pages/Home.tsx:130,193,209` | Conectar `Home.tsx` con procedimientos tRPC que lean datos reales del tenant desde Supabase DB. |
| **V1-10** | Botones que solo mostraban toast | **ABIERTO** | `client/src/pages/Home.tsx:130,148,193,206,209` (`onClick={() => toast.info(...)}`) | Conectar botones con acciones reales (p. ej. descarga de informes, redirección a detalles, configuración). |
| **V1-11** | `Page 1`, `Page 2`, `/some-path`, `ComponentShowcase` | **ABIERTO** | `client/src/components/DashboardLayout.tsx:31-32` y `client/src/pages/ComponentShowcase.tsx` | Eliminar archivos y enlaces huérfanos del proyecto. |
| **V1-12** | Configuración satelital solo en `localStorage` | **ABIERTO** | `client/src/pages/SatelliteConfiguration.tsx:31,66` (`localStorage.setItem("cleanleaf-satellite-preferences", ...)`) | Persistir preferencias satelitales en la tabla `tenant_settings` / `user_preferences` en Supabase. |
| **V1-13** | Perfil y cambio de contraseña no implementados | **ABIERTO** | Rutas `/dashboard/perfil` e interfaces no existen en `client/src/App.tsx` | Crear la vista de Perfil de Usuario con opciones de actualización y cambio de clave vía Supabase Auth. |
| **V1-14** | PDF, GeoJSON y Shapefile simulados | **ABIERTO** | `client/src/components/ReportDownloadActions.tsx:28-29` (`window.print()`, HTML estático como `.doc`) | Implementar servicio backend de generación de PDF/GeoJSON/Shapefile y subir a Supabase Storage con URLs firmadas. |
| **V1-15** | Caché de Copernicus en RAM | **ABIERTO** | `server/copernicus.ts:301` (`private resultCache = new Map()`) | Persistir caché de observaciones en tabla PostgreSQL (`observation_cache`). |
| **V1-16** | Tier 3 solo rechazado | **ABIERTO** | `server/routers.ts:121` y `server/copernicus.ts:296` (`throw CopernicusUnavailableError`) | Implementar pipeline de revisión manual / Batch API para Tier 3. |
| **V1-17** | Variable `sst` sobre Sentinel-3 OLCI | **ABIERTO** | `server/copernicus.ts:45` (`productForSatellite` devuelve `"sentinel-3-olci"`) | Corregir mapeo a sensor **SLSTR** (`sentinel-3-slstr`) de Sentinel-3 y ajustar evalscript térmico. |
| **V1-18** | `createAnalysis` síncrono | **ABIERTO** | `server/routers.ts:100-170` (ejecuta `await observationProvider.query` en la mutación HTTP) | Desacoplar creación de solicitud (estado `en_cola`) de la ejecución mediante worker asíncrono. |
| **V1-19** | Informes desde catálogo en memoria, sin persistencia | **ABIERTO** | `shared/report-catalog.ts:16` (`const demoReports = [...]`) y `server/routers.ts:191` | Consultar e insertar informes exclusivamente en las tablas `solicitudes_analisis` e `informes` en Postgres. |
| **V1-20** | `vendor-charts` de ~405 kB y bundle principal | **PARCIAL** | `dist/public/assets/vendor-charts-Bt_LSy95.js` (404.70 kB), `index-cg7ISrE_.js` (499.74 kB) | Aplicar lazy loading / code splitting más agresivo en librerías de gráficos. |
| **V1-21** | Hotfix de `copernicus.test.ts` | **CERRADO** | PR #22 en commit `937510d` (línea 173 corregida, 48/48 tests pasados) | Ninguno. Totalmente corregido. |

---

### Hallazgos Nuevos Introducidos por Fases Recientes

1. **`apiV1.apiKeys.create` expuesto públicamente sin autorización (SEVERIDAD: CRÍTICA)**
   - *Evidencia:* `server/routers.ts:236-241`. El procedimiento permite a cualquier usuario anónimo enviar `{ tenantId: "cualquier-tenant", nombre: "key-maliciosa" }` y recibir una clave API hash sha256 válida.
2. **Hardcode de Credenciales por Defecto en `env.ts` (SEVERIDAD: ALTA)**
   - *Evidencia:* `server/_core/env.ts:13` contiene la cadena hardcodeada `"sh-79ab7ae6-ca8d-4823-90d1-fca2c30fe535"`.
3. **Ausencia de Middlewares de Seguridad Express (SEVERIDAD: ALTA)**
   - *Evidencia:* `server/app.ts`. No se configuran `helmet` para cabeceras HTTP ni `rate-limit` para prevención de ataques DoS o fuerzabruta.
4. **Vulnerabilidades de Seguridad en Dependencias Core (SEVERIDAD: ALTA)**
   - *Evidencia:* `pnpm audit` reporta 164 vulnerabilidades, incluyendo 6 de nivel Crítico en Express/Body-Parser.

---

### Preparación Agéntica

1. **¿La lógica de negocio está en una capa de servicios que recibe un contexto explícito (`userId`, `tenantId`, `role`), separada de los routers?**
   - **NO**. *Evidencia:* Toda la lógica de creación de solicitudes y límites de plan reside dentro de funciones auxiliares en `server/routers.ts` que aceptan directamente parámetros arbitrarios del payload cliente.
2. **¿`workflow_logs` y `audit_log` distinguen actor usuario, sistema y agente?**
   - **NO**. *Evidencia:* La tabla `audit_log` no existe en la base de datos (`supabase/schema.sql`). La tabla `workflow_logs` existe en el esquema pero no es escrita por el servidor.
3. **¿Existen API keys con scopes, con hash, rotación y auditoría de uso?**
   - **NO**. *Evidencia:* El procedimiento `apiKeys.create` en `server/routers.ts:236` es un stub de 5 líneas que genera una cadena aleatoria y su hash en RAM, sin scopes, expiración ni persistencia.
4. **¿Los errores son tipados y con códigos estables?**
   - **PARCIAL**. *Evidencia:* `server/copernicus.ts` define clases de error como `CopernicusAuthError` y `CopernicusRateLimitError`, pero `server/routers.ts` captura excepciones genéricas y las transforma en strings.
5. **¿Hay presupuesto por tenant para cuota de CDSE?**
   - **NO**. *Evidencia:* No existe tabla ni lógica de control de presupuesto o tasa de consumo de créditos de Copernicus por tenant.

---

### Pruebas Funcionales de Aislamiento Multi-Tenant

- **Estado:** **NO VERIFICADO**.
- **Explicación:** El backend en `main` no consume la base de datos Supabase Postgres ni aplica los filtros de RLS en las consultas de los routers tRPC. Dado que todos los procedimientos son públicos y leen de arreglos/Mapas globales en memoria, las pruebas funcionales de aislamiento entre tenants a nivel de base de datos no pueden ejecutarse actualmente contra el runtime del servidor.
- **Instrucción de ejecución futura:** Una vez conectado el contexto tRPC con Supabase Auth, ejecutar un script con 2 usuarios de tenants distintos (`tenant_a` y `tenant_b`) intentando leer informes con el token JWT cruzado y verificar que la respuesta sea 404/UNAUTHORIZED.

---

## Plan Siguiente Priorizado (P0 a P3)

### P0 — Bloqueantes de Seguridad y Multi-Tenant (Esfuerzo: L)
- **Tarea P0.1:** Conectar `createContext` en `server/_core/context.ts` con Supabase Auth para validar el token JWT `Authorization: Bearer` y popular `ctx.user` con `{ userId, tenantId, role }`. *(XS)*
- **Tarea P0.2:** Convertir **todos** los procedimientos tRPC de `server/routers.ts` a `protectedProcedure` o `adminProcedure`. *(S)*
- **Tarea P0.3:** Eliminar la lectura de `planId`, `haMesUsadas` y `prediosActivos` desde el cliente en `analysisInput`. Extraer la suscripción y uso exclusivamente desde Supabase DB. *(S)*
- **Tarea P0.4:** Implementar el Auth Hook Custom Claims en Supabase (`auth.custom_access_token_hook`) para inyectar `tenant_id` y `role` en `app_metadata`. *(S)*

### P1 — Persistencia Real y Desacoplamiento de Worker (Esfuerzo: L)
- **Tarea P1.1:** Migrar `solicitudes_analisis`, `informes`, `predios` y `consumo` de RAM/stubs a consultas reales Supabase en `server/db/repository.ts` respetando RLS. *(L, Dep: P0.1)*
- **Tarea P1.2:** Crear el worker asíncrono `server/services/analysis-worker.ts` para procesar solicitudes en estado `en_cola` de forma desacoplada con reintentos y backoff. *(M, Dep: P1.1)*
- **Tarea P1.3:** Corregir la clave de idempotencia para incluir `tenantId` (`${tenantId}:${idempotencyKey}`) y persistir en `solicitudes_analisis`. *(XS, Dep: P1.1)*

### P2 — Corrección del Motor Copernicus y Exportaciones (Esfuerzo: M)
- **Tarea P2.1:** Corregir el mapeo de la variable `sst` de Sentinel-3 OLCI a **Sentinel-3 SLSTR** (`sentinel-3-slstr`) en `server/copernicus.ts`. *(S)*
- **Tarea P2.2:** Reemplazar el fallback silencioso de `FallbackObservationProvider` por una notificación explícita de fallo o degradación en el informe. *(S)*
- **Tarea P2.3:** Implementar generación real de PDF con PDFKit y almacenamiento en Supabase Storage con URLs firmadas de corta duración. *(M, Dep: P1.1)*

### P3 — Limpieza de Código, UI y Endurecimiento (Esfuerzo: S)
- **Tarea P3.1:** Eliminar archivos huérfanos (`DashboardLayout.tsx`, `ComponentShowcase.tsx`) y corregir navegación en `App.tsx`. *(XS)*
- **Tarea P3.2:** Agregar middlewares de Express (`helmet`, `express-rate-limit`) en `server/app.ts`. *(XS)*
- **Tarea P3.3:** Actualizar dependencias vulnerables (`pnpm audit fix`). *(S)*

---

## Veredicto Final

**NO LISTO** (Bloqueantes: procedimientos tRPC 100% públicos sin auth en backend; desacoplamiento total entre runtime y Supabase Postgres; elusión de cuotas/planes por inyección de parámetros del cliente; fallback silencioso a datos sintéticos; e imprecisión técnica en variable `sst` sobre Sentinel-3 OLCI).
