# 08_arquitectura.md

## a) Puntos de entrada y componente que inicia cada uno

- `client/src/main.tsx`: Punto de entrada del cliente frontend React; monta el árbol de componentes DOM con `QueryClientProvider` y `trpc.Provider`.
- `server/_core/index.ts`: Punto de entrada principal del servidor HTTP Express; inicializa variables de entorno, servidor tRPC, middleware y escucha en puerto configurado.
- `server/worker.ts`: Punto de entrada del worker asíncrono en segundo plano; ejecuta el bucle de procesamiento continuo de solicitudes de análisis satelital.
- `vite.config.ts`: Punto de entrada de bundling de Vite para el cliente web; configura plugins React, alias de módulos y chunks de librerías vendor.
- `vitest.config.ts`: Punto de entrada de ejecución del suite de pruebas automáticas Vitest.

## b) Tabla de módulos (carpetas de 1er y 2do nivel)

| Módulo | Responsabilidad | N° Archivos | N° Líneas |
| --- | --- | --- | --- |
| `.` | Configuraciones globales de raíz, manifiestos y variables de entorno | 15 | 10199 |
| `.github/workflows` | Módulo de soporte del repositorio | 2 | 88 |
| `client` | Módulo de soporte del repositorio | 1 | 14 |
| `client/public` | Recursos estáticos servidos públicamente por el cliente web | 2 | 821 |
| `client/src` | Código fuente frontend en React (App, main, hooks, lib) | 89 | 11013 |
| `docs` | Módulo de soporte del repositorio | 17 | 7195 |
| `docs/handoffs` | Documentos de traspaso técnico y transiciones de desarrollo | 1 | 40 |
| `docs/inventario` | Inventario mecánico del repositorio y scripts de generación automáticos | 14 | 2534 |
| `drizzle` | Módulo de soporte del repositorio | 2 | 14 |
| `drizzle/meta` | Snapshots JSON de esquema generados por Drizzle ORM | 2 | 123 |
| `drizzle/migrations` | Módulo de soporte del repositorio | 1 | 0 |
| `n8n/workflows` | Definiciones JSON de flujos de trabajo automatizados en n8n | 2 | 36 |
| `patches` | Módulo de soporte del repositorio | 1 | 28 |
| `server` | Módulo de soporte del repositorio | 14 | 3688 |
| `server/_core` | Infraestructura del servidor Express, tRPC, entorno y contexto | 17 | 2166 |
| `server/admin` | Cliente administrativo Supabase con service_role key | 1 | 25 |
| `server/analysis` | Motor de interpretación agronómica y reglas de recomendación | 2 | 173 |
| `server/db` | Capa de repositorio e interfaz de base de datos Supabase/PostgreSQL | 2 | 1578 |
| `server/reports` | Servicio de generación de reportes PDF Kit y almacenamiento | 3 | 411 |
| `server/services` | Servicios asíncronos backend, worker, escenas y series temporales | 6 | 753 |
| `shared` | Módulo de soporte del repositorio | 14 | 1031 |
| `shared/_core` | Módulo de soporte del repositorio | 1 | 19 |
| `supabase` | Módulo de soporte del repositorio | 2 | 250 |
| `supabase/migrations` | Scripts SQL de migraciones versionadas e idempotentes de Supabase | 7 | 288 |

## c) Matriz carpeta → carpeta de dependencias (número de imports entre módulos)

| Módulo Origen | client/src | server | shared |
| --- | --- | --- | --- |
| `client/src` | 0 | 1 | 14 |
| `server` | 0 | 0 | 31 |
| `shared` | 0 | 0 | 0 |

## d) Ciclos de importación (madge --circular)

```text
Processed 0 files (665ms)
```

## e) Servicios externos referenciados en código o configuración

### Supabase
**N° de archivos que lo referencian:** 50
- `.env.example`
- `.github/workflows/ci.yml`
- `README.md`
- `client/src/_core/hooks/useAuth.ts`
- `client/src/components/ProtectedRoute.tsx`
- `client/src/lib/supabaseClient.ts`
- `client/src/main.tsx`
- `client/src/pages/AuthPage.tsx`
- `client/src/pages/LandingPage.tsx`
- `client/src/pages/ProfilePage.tsx`
- `client/src/pages/ResetPasswordPage.tsx`
- `docs/AUDITORIA_ESPEJO_PLATAFORMA_v3b.md`
- `docs/AUDITORIA_ESPEJO_PLATAFORMA_v4.md`
- `docs/DIAGNOSTICO_FLUJOS.md`
- `docs/FASE1_AUTH.md`
- `docs/JULES_HANDOFF.md`
- `docs/RENDER_ENV.md`
- `docs/architecture-diagram.mmd`
- `docs/architecture-map.md`
- `docs/handoffs/MANUS_TO_JULES.md`
- `docs/inventario/01_archivos.csv`
- `docs/inventario/04_base_de_datos.csv`
- `docs/inventario/05_variables_entorno.csv`
- `docs/inventario/06_duplicados.md`
- `docs/inventario/07_huerfanos.md`
- `docs/inventario/scripts/generate_04_base_de_datos.py`
- `docs/inventario/scripts/generate_05_variables_entorno.py`
- `docs/reports-dashboard-guide.md`
- `docs/satellite-selection-guide.md`
- `docs/v6-coverage-audit.md`
- `docs/v7-diagnostic.md`
- `knip_output.json`
- `n8n/workflows/sentinel-weekly-update.json`
- `package.json`
- `pnpm-lock.yaml`
- `server/_core/context.ts`
- `server/_core/env.ts`
- `server/admin/supabase-client.ts`
- `server/app.test.ts`
- `server/app.ts`
- `server/db/repository.ts`
- `server/db/supabase-client.ts`
- `server/fase1-auth-config.test.ts`
- `server/reports/storage-service.ts`
- `server/services/analysis-worker.ts`
- `server/services/copernicus-policy-service.ts`
- `server/worker.ts`
- `supabase/migrations/003_auth_hook_and_idempotency.sql`
- `supabase/schema.sql`
- `supabase/seed.sql`

### Copernicus CDSE
**N° de archivos que lo referencian:** 56
- `.env.example`
- `.github/workflows/ci.yml`
- `.github/workflows/staging-copernicus-smoke.yml`
- `README.md`
- `client/src/components/CopernicusResourcePanel.tsx`
- `client/src/components/SolicitudAnalisisForm.tsx`
- `client/src/pages/AuthPage.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/LandingPage.tsx`
- `client/src/pages/SatelliteConfiguration.tsx`
- `client/src/pages/SatellitesPlaceholderPage.tsx`
- `docs/AUDITORIA_ESPEJO_PLATAFORMA_v3b.md`
- `docs/AUDITORIA_ESPEJO_PLATAFORMA_v4.md`
- `docs/COPERNICUS_OPERACION.md`
- `docs/DIAGNOSTICO_FLUJOS.md`
- `docs/FASE1_AUTH.md`
- `docs/JULES_HANDOFF.md`
- `docs/RENDER_ENV.md`
- `docs/architecture-diagram.mmd`
- `docs/architecture-map.md`
- `docs/handoffs/MANUS_TO_JULES.md`
- `docs/inventario/01_archivos.csv`
- `docs/inventario/02_rutas_backend.csv`
- `docs/inventario/04_base_de_datos.csv`
- `docs/inventario/05_variables_entorno.csv`
- `docs/inventario/06_duplicados.md`
- `docs/inventario/07_huerfanos.md`
- `docs/inventario/scripts/generate_02_rutas_backend.py`
- `docs/inventario/scripts/generate_03_rutas_frontend.py`
- `docs/inventario/scripts/generate_05_variables_entorno.py`
- `docs/satellite-selection-guide.md`
- `docs/v7-diagnostic.md`
- `knip_output.json`
- `server/_core/env.ts`
- `server/app.test.ts`
- `server/app.ts`
- `server/catalog-client.test.ts`
- `server/catalog-client.ts`
- `server/copernicus.test.ts`
- `server/copernicus.ts`
- `server/reports/pdf-service.ts`
- `server/reports/report-view-model.ts`
- `server/routers.ts`
- `server/satellite-domain.test.ts`
- `server/services/analysis-worker.ts`
- `server/services/copernicus-policy-service.ts`
- `server/services/copernicus-scenes-service.ts`
- `server/services/copernicus-thumbnail-service.ts`
- `server/stac-client.ts`
- `shared/copernicus-api.ts`
- `shared/copernicus-catalog.ts`
- `shared/data-traceability.ts`
- `shared/observation-provider.ts`
- `shared/report-catalog.ts`
- `shared/satellite-service.ts`
- `supabase/migrations/009_escenas_and_informe_escenas.sql`

### Dify
**N° de archivos que lo referencian:** 9
- `README.md`
- `docs/DIAGNOSTICO_FLUJOS.md`
- `docs/JULES_HANDOFF.md`
- `docs/architecture-map.md`
- `docs/reports-dashboard-guide.md`
- `docs/satellite-env.example`
- `docs/v6-coverage-audit.md`
- `docs/v7-runtime-config.example`
- `server/satellite-domain.test.ts`

### n8n
**N° de archivos que lo referencian:** 14
- `README.md`
- `docs/DIAGNOSTICO_FLUJOS.md`
- `docs/JULES_HANDOFF.md`
- `docs/architecture-diagram.mmd`
- `docs/architecture-map.md`
- `docs/inventario/01_archivos.csv`
- `docs/inventario/04_base_de_datos.csv`
- `docs/reports-dashboard-guide.md`
- `docs/satellite-env.example`
- `docs/v6-coverage-audit.md`
- `docs/v7-diagnostic.md`
- `docs/v7-runtime-config.example`
- `n8n/workflows/sentinel-on-demand.json`
- `n8n/workflows/sentinel-weekly-update.json`

### Redis / Upstash
**N° de archivos que lo referencian:** 4
- `docs/inventario/05_variables_entorno.csv`
- `docs/inventario/07_huerfanos.md`
- `pnpm-lock.yaml`
- `server/app.ts`

### Render
**N° de archivos que lo referencian:** 6
- `AGENTS.md`
- `docs/RENDER_ENV.md`
- `docs/handoffs/MANUS_TO_JULES.md`
- `docs/inventario/01_archivos.csv`
- `docs/inventario/05_variables_entorno.csv`
- `server/copernicus.ts`

### Vercel
**N° de archivos que lo referencian:** 13
- `.env.example`
- `AGENTS.md`
- `client/src/lib/supabaseClient.ts`
- `client/src/pages/AuthPage.tsx`
- `docs/FASE1_AUTH.md`
- `docs/RENDER_ENV.md`
- `docs/inventario/05_variables_entorno.csv`
- `server/_core/context.ts`
- `server/_core/env.ts`
- `server/admin/supabase-client.ts`
- `server/app.ts`
- `server/db/supabase-client.ts`
- `server/fase1-auth-config.test.ts`

### Stripe
**N° de archivos que lo referencian:** 5
- `README.md`
- `docs/JULES_HANDOFF.md`
- `docs/v6-coverage-audit.md`
- `docs/v7-diagnostic.md`
- `supabase/schema.sql`

### Twilio / SMS OTP
**N° de archivos que lo referencian:** 4
- `.env.example`
- `docs/FASE1_AUTH.md`
- `docs/inventario/05_variables_entorno.csv`
- `docs/inventario/07_huerfanos.md`

## f) Archivos de configuración y despliegue

- `render.yaml` (No existe en repositorio): Configuración de infraestructura Render para servicio web Node.js y worker asíncrono.
- `vercel.json` (No existe en repositorio): Configuración de despliegue frontend en Vercel con reescritura de rutas SPA.
- `Dockerfile` (No existe en repositorio): Definición de contenedor Docker multi-etapa para compilación e imagen de producción.
- `.github/workflows/ci.yml` (Existe): Flujo CI de GitHub Actions para ejecución automatizada de typecheck, pruebas y build.