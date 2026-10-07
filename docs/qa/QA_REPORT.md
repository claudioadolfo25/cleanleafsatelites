# Registro de Integración J0 y Auditoría de Merge
**Rama:** `integration/mvp`
**Base Commit:** `c503d4b661f38e88e54869ad98cded6313352258`
**Ramas Fusionadas:** `ae05c44` (Agro) y `ddaa022` (Admin Console)
**Fecha:** Octubre 2026

---

## 1. Verificación de Ancestros Git
- `git merge-base --is-ancestor ae05c44 HEAD` → **SI**
- `git merge-base --is-ancestor ddaa022 HEAD` → **SI**

---

## 2. Decisiones de Fusión por Archivo en Conflicto

| Archivo en Conflicto | Origen Conservado | Decisión y Justificación Técnica |
| :--- | :--- | :--- |
| `client/index.html` | Combinado | Eliminadas las etiquetas unbundled de Umami analytics para evitar advertencias en Vite build; conservada la raíz del DOM React. |
| `client/src/App.tsx` | Combinado | Integradas las rutas de dashboard, autenticación Supabase y la ruta protegida `/dashboard/admin`. |
| `client/src/components/DashboardLayout.tsx` | Combinado | Mantenida la navegación lateral con ícono condicional para Admin Console. |
| `client/src/components/SolicitudAnalisisForm.tsx` | Combinado | Conservado el cálculo dinámico de BBox por hectáreas e inyección de filtros Copernicus. |
| `client/src/main.tsx` | Combinado | Conservada la inicialización de Wouter router y QueryClient. |
| `client/src/pages/Home.tsx` | Combinado | Integradas las tarjetas de resumen agrícola y accesos directos de administración. |
| `client/src/pages/ReportDetail.tsx` | Combinado | Conservada la visualización multi-satélite e insignias de trazabilidad. |
| `client/src/pages/ReportsDashboard.tsx` | Combinado | Mantenidas las métricas NDVI y el botón "Ver Mapa Satelital". |
| `client/src/pages/SatelliteConfiguration.tsx` | Combinado | Conservados los controles de filtro de nubosidad, polarizaciones e índices. |
| `package.json` | Combinado | Mantenidas las dependencias unificadas (React 19, Vite 7, Express 4.21, Supabase Client 2.117, Vitest 2.1). |
| `server/_core/index.ts` | Combinado | Mantenida la configuración de Express, CORS con Vary Origin y escuchador HTTP. |
| `server/admin/supabase-client.ts` | Combinado | Fail-fast startup en entornos no-test y fallback mock en vitest. |
| `server/routes/api-v1.ts` | Combinado | Mantenidos los endpoints REST `/api/v1/*` para predios, solicitudes, informes, alertas, pagos, invitaciones y roles. |
| `server/satellite-domain.test.ts` | Combinado | Conservadas las 27 pruebas del dominio satelital agrícola. |
| `shared/satellite-catalog.ts` | Combinado | Unificada la allowlist de política por vertical y chequeo safe de variables de entorno. |
| `shared/satellite-router.ts` | Combinado | Unificada la lógica de asignación de tiers por hectáreas (Tier 1 < 50ha, Tier 2 < 5000ha, Tier 3 >= 5000ha). |
| `shared/types.ts` | Combinado | Unificado el catálogo de roles (`super_admin`, `owner`, `admin`, `admin_tenant`, `agronomo`, `agricultor`, `viewer`). |
| `vite.config.ts` | Combinado | Mantenidos los aliases `@`, `@shared`, `@assets` y el plugin de React. |

---

## 3. Matriz Explicativa de suites de Pruebas (64 tests / 11 suites)

| Suite de Test | Tests | Descripción y Cobertura |
| :--- | :--- | :--- |
| `server/satellite-domain.test.ts` | 27 | Pruebas de catálogo satelital por vertical, tiers, router, limits y máquina de estados. |
| `server/api-v1.test.ts` | 9 | Pruebas de autenticación JWT, prevención de escalada de roles y bordes multi-tenant. |
| `server/services/copernicus-orchestrator.test.ts` | 5 | Pruebas de evalscript multispectral (NDVI, NDRE, LSWI), enmascaramiento SCL y fallback. |
| `tests/sat2farm-honest-enhancements.test.ts` | 5 | Pruebas de trazabilidad honesta, pronóstico Open-Meteo y fenología GDD. |
| `server/services/specialists.test.ts` | 4 | Pruebas de los 6 Agentes Especialistas y cálculo de confianza consolidada. |
| `server/services/copernicus-auth.test.ts` | 3 | Pruebas de token caching OAuth2 CDSE y refresco proactivo. |
| `tests/reports-dashboard.test.ts` | 3 | Pruebas de filtrado y renderizado de informes en dashboard. |
| `tests/copernicus-integration.test.ts` | 3 | Pruebas de cliente Copernicus Provider y enrutamiento de consultas. |
| `tests/button-audit-navigation.test.ts` | 2 | Pruebas de navegación y permisos de interfaz. |
| `tests/guide-interpreter.test.ts` | 2 | Pruebas del flujo de 4 pasos de interpretación de informes. |
| `server/auth.logout.test.ts` | 1 | Prueba de mutación tRPC logout y limpieza de cookie de sesión. |
| **TOTAL** | **64** | **11 Suites ejecutadas y pasadas al 100%.** |
