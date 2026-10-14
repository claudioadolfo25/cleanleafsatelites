# Estado Actual de la Arquitectura — Cleanleaf Satélites

**Fecha de evaluación:** Octubre 2026 / Fase 1 Inspección y Diagnóstico
**Modalidad:** Inspección y diagnóstico sin modificación de código de aplicación, esquema DB ni configuración de despliegue. Principios gstack aplicados manualmente por agente Jules.

---

## 1. Ficha Técnica de Infraestructura y Frameworks

* **Arquitectura de Despliegue:** Monolito en proceso Node.js persistente hospedado exclusivamente en **Render Web Service** (`cleanleafsatelites.onrender.com`).
* **Framework Frontend:** React 19 (`react@^19.2.1`) con Vite 7 (`vite@^7.1.7`), Tailwind CSS 4 (`tailwindcss@^4.1.14`), Wouter (`wouter@^3.7.1`) y Radix UI.
* **Framework Backend:** Express 4 (`express@^4.21.2`) montando adaptador tRPC 11 (`@trpc/server@^11.6.0`) y rutas REST de salud (`/api/health`).
* **Gestor de Paquetes:** `pnpm` (versión definida en `package.json`: `pnpm@10.4.1`).
* **Entorno Node:** Versión del motor declarada en `engines`: `"node": "20.x"`. En el entorno sandbox activo se ejecuta Node.js `v22.22.1` con `pnpm` `10.4.1`.
* **Comandos Reales de Preparación, Build, Typecheck y Test:**
  * **Instalación:** `pnpm install --frozen-lockfile` (783 paquetes instalados).
  * **Typecheck (Comprobación estática):** `pnpm check` (`tsc --noEmit`). Resultado: 0 errores de compilación TypeScript.
  * **Pruebas (Unitarias e Integración):** `pnpm test` (`vitest run`). Resultado: 6 suites pasadas, 40 pruebas unitarias pasadas en 2.09s.
  * **Compilación/Build:** `pnpm build` (`vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`). Resultado: `dist/public` (frontend SPA) y `dist/index.js` (79.8kb servidor Node).

---

## 2. Límites entre Componentes y Capas

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NAVEGADOR (Cliente SPA)                          │
│ React 19 + Wouter + tRPC Client + Supabase JS Client                       │
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │ /api/trpc & /api/health       │ Auth & Direct RLS
                       ▼                               ▼
┌───────────────────────────────────────────────┐ ┌───────────────────────────┐
│              NODE.JS / EXPRESS                │ │    SUPABASE POSTGRES      │
│            (Render Web Service)               │ │ (Esquema RLS multi-tenant)│
│                                               │ └───────────────────────────┘
│ - Express App (app.set("trust proxy", 1))     │
│ - tRPC Router (appRouter)                     │
│ - Copernicus CDSE Provider (STAC / Stats API)  │
│ - In-Memory Idempotency Store (Map)           │
└──────────────────────┬────────────────────────┘
                       │ OAuth2 Client Credentials
                       ▼
┌───────────────────────────────────────────────┐
│     COPERNICUS DATA SPACE ECOSYSTEM (CDSE)    │
│  - STAC API (https://stac.dataspace.copernicus.eu/v1)
│  - Statistics API (https://sh.dataspace.copernicus.eu/api/v1/statistics)
└───────────────────────────────────────────────┘
```

---

## 3. Matriz de Hallazgos Arquitectónicos

### Hallazgo ARQ-01: Desconexión de Persistencia entre Solicitudes e Informes
* **Archivo o componente:** `server/routers.ts` (líneas 82–120) vs. `shared/report-catalog.ts` (líneas 18–26).
* **Evidencia:** Las solicitudes generadas mediante `createAnalysisRequest` se guardan únicamente en un `Map` en memoria (`idempotencyStore`). La consulta `cleanleaf.reports.list` devuelve la constante estática `demoReports` alojada en `shared/report-catalog.ts`.
* **Impacto:** Un usuario que crea una nueva solicitud de análisis ve una notificación de éxito, pero la solicitud **nunca** aparece en la lista de "Mis Informes" (`/dashboard/informes`). Además, al reiniciar el servidor en Render o sufrir cold start, las solicitudes en memoria se pierden.
* **Acción propuesta:** Sustituir la constante `demoReports` y el `idempotencyStore` en memoria por persistencia en las tablas `solicitudes_analisis` e `informes` de Supabase Postgres.

---

### Hallazgo ARQ-02: Dualidad en Mecanismos de Autenticación
* **Archivo o componente:** `client/src/_core/hooks/useAuth.ts` y `server/_core/context.ts` vs. `client/src/pages/AuthPage.tsx` y `client/src/components/ProtectedRoute.tsx`.
* **Evidencia:** El cliente posee dos sistemas paralelos:
  1. `AuthPage.tsx` y `ProtectedRoute.tsx` usan directamente `@supabase/supabase-js` para iniciar sesión con Email, OTP SMS o Google OAuth, verificando la sesión con `supabase.auth.getSession()`.
  2. `useAuth.ts` y `server/_core/context.ts` usan el middleware de Manus OAuth leyendo la cookie `manus-cookie` e invocando `sdk.authenticateRequest(req)`.
* **Impacto:** Los endpoints tRPC usan `publicProcedure`, permitiendo el acceso sin validar la sesión de Supabase. El servidor no extrae el `tenant_id` de las llamadas tRPC desde la sesión de Supabase, impidiendo el aislamiento multi-tenant en el backend.
* **Acción propuesta:** Unificar la autenticación en el servidor Express leyendo el token JWT de Supabase (encabezado `Authorization: Bearer <token>`) o cookie de sesión, extrayendo `user_id` y `tenant_id` hacia el contexto de tRPC.

---

### Hallazgo ARQ-03: Inoperatividad de Consultas Satelitales Reales por Falta de Secreto en Producción
* **Archivo o componente:** `server/copernicus.ts` (líneas 63–67) y `server/routers.ts` (líneas 84–90).
* **Evidencia:** En `server/routers.ts`:
  ```ts
  const observationProvider: EarthObservationProvider = isTestRuntime
    ? new MockCopernicusProvider()
    : copernicusMode === "live" && copernicusCDSEProvider.getTokenManager().isConfigured()
      ? copernicusCDSEProvider
      : new CopernicusUnavailableProvider();
  ```
  Al no estar configurada la variable `COPERNICUS_CLIENT_SECRET` en Render, `isConfigured()` retorna `false` y el servidor asigna `CopernicusUnavailableProvider`.
* **Impacto:** En producción, si un usuario intenta solicitar un análisis, `CopernicusUnavailableProvider.query()` lanza un error: `"Copernicus no está conectado. Configura COPERNICUS_MODE=live y COPERNICUS_CLIENT_SECRET."`.
* **Acción propuesta:** Cargar la variable de entorno `COPERNICUS_CLIENT_SECRET` en el panel de Render o configurar un fallback transparente etiquetado como `data_source: "synthetic"` mientras se obtienen credenciales de producción.

---

### Hallazgo ARQ-04: Esquema MySQL vs. Tablas Supabase Postgres
* **Archivo o componente:** `server/db.ts` / `drizzle/schema.ts` vs. `supabase/schema.sql`.
* **Evidencia:** `server/db.ts` inicializa Drizzle ORM para MySQL (`mysql2`), pero no existe servidor MySQL activo ni variable `DATABASE_URL` configurada. En paralelo, `supabase/schema.sql` define la estructura Postgres multi-tenant con Row Level Security (RLS) para `tenants`, `users`, `predios`, `solicitudes_analisis`, e `informes`.
* **Impacto:** Ambigüedad en la capa de datos. El código activo del backend no está conectado ni a MySQL ni a Supabase Postgres para la persistencia del flujo de trabajo.
* **Acción propuesta:** Consolidar Supabase Postgres como la única fuente de verdad de base de datos, conectando `@supabase/supabase-js` con la `SUPABASE_SERVICE_ROLE_KEY` o utilizando el cliente Drizzle con el driver `postgres` para Supabase.

---

## 4. Estado de Verificación de Entorno (Lo Comprobado vs. Lo No Comprobado)

### Lo Comprobado
1. **Comprobación estática TypeScript (`pnpm check`):** Ejecutada y validada exitosamente (0 errores).
2. **Pruebas unitarias (`pnpm test`):** Ejecutadas y validadas exitosamente (40 pruebas pasadas).
3. **Build local del proyecto (`pnpm build`):** Ejecutado y validado exitosamente. Genera cliente distribuible y archivo `dist/index.js`.
4. **Respuesta de endpoints REST locales:** `/api/health` retorna JSON con diagnósticos de variables.

### Lo No Comprobado
1. **Despliegue real en producción Render:** No se han publicado ni desplegado cambios en `cleanleafsatelites.onrender.com`.
2. **Consultas HTTP reales a CDSE Copernicus:** No se han realizado peticiones con credenciales de cliente a `https://sh.dataspace.copernicus.eu/api/v1/statistics` en entorno de producción sin aprobación previa.
3. **Persistencia activa en Supabase Postgres en la nube:** No se ha comprobado la ejecución de `supabase/schema.sql` sobre una instancia remota de Supabase.
