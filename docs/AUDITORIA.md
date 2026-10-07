# AgroPulso — Informe de Auditoría Técnica Repo (Tarea 1, Parte 1)

**Fecha:** 24 de Septiembre de 2026
**Auditor:** Jules (Agente AI)
**Versión del Repo:** `cleanleaf` (AgroPulso / Cleanleaf MVP v8.0)

---

## 1. Stack Real y Arquitectura
- **Frontend:** React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 4 + Radix UI / shadcn/ui.
- **Backend / Router:** Node.js (Express) con tRPC (v11) sirviendo endpoints y API versionada `apiV1`.
- **Autenticación actual:** Cookie de sesión con stub / Manus OAuth simulado (`server/_core/oauth.ts`, `server/_core/context.ts`).
- **Base de Datos / ORM:**
  - Runtime actual de desarrollo/plantilla: Drizzle ORM (`drizzle-orm` / `drizzle-kit`) configurado para MySQL/MariaDB (`mysql2`).
  - Objetivo de migración: Supabase PostgreSQL (`supabase/schema.sql` y `supabase/seed.sql`).

---

## 2. Inventario de Carpetas y Componentes Principal
- `client/`: Aplicación SPA React / Vite.
  - `src/pages/`: Pantallas principales (`Home`, `ReportsDashboard`, `ReportDetail`, `SatelliteConfiguration`).
  - `src/components/`: Componentes UI y formularios de solicitud satelital (`SolicitudAnalisisForm`, `VariableChart`, `CopernicusResourcePanel`).
- `server/`: Servidor Express, procedimientos tRPC, utilidades de autenticación y stubs del dominio.
  - `_core/`: Infraestructura del runtime base (OAuth, cookies, tRPC, context, env).
  - `routers.ts`: Routers tRPC principales y namespace `apiV1`.
- `shared/`: Lógica compartida de catálogo y validación de dominio satelital (`satellite-catalog.ts`, `satellite-router.ts`, `plan-limits.ts`, `interpretation.ts`, `copernicus-catalog.ts`).
- `drizzle/`: Esquema de base de datos Drizzle/MySQL (`schema.ts`).
- `supabase/`: Esquema objetivo Supabase PostgreSQL con RLS (`schema.sql`) y datos semilla (`seed.sql`).
- `docs/`: Documentación de diagnóstico, arquitectura, guías de handoff e informes técnicos de v7.

---

## 3. Coincidencias de Términos Heredados / Prohibidos

| Término | Archivos / Referencias detectadas |
| --- | --- |
| **manus** | `vite.config.ts`, `vite-plugin-manus-runtime` en `package.json`, `server/_core/env.ts`, `server/_core/oauth.ts`, `server/_core/context.ts`, `server/auth.logout.test.ts`, `template.json`. |
| **forge** | Ninguna coincidencia directa en código fuente activo. |
| **trpc** | `@trpc/client`, `@trpc/react-query`, `@trpc/server` en `package.json`; `server/_core/trpc.ts`, `client/src/lib/trpc.ts`, `server/routers.ts`. |
| **drizzle** | `drizzle-orm`, `drizzle-kit` en `package.json`; `drizzle/schema.ts`, `server/db.ts`, `drizzle.config.ts`. |
| **mysql** | `mysql2` en `package.json`; `drizzle/schema.ts` (uso de `mysqlTable`, `mysqlEnum`). |
| **tidb** | Ninguna coincidencia directa en el código fuente. |
| **oauth** | `server/_core/oauth.ts`, `template.json`, referencias en `README.md` sobre credenciales server-side OAuth2 para Copernicus CDSE. |

---

## 4. Auditoría de Esquema Supabase (`supabase/schema.sql`)

### Tablas y Estado de RLS:
1. `tenants`: Tabla principal de clientes multi-tenant.
2. `users`: Usuarios vinculados a `tenant_id`.
3. `planes` / `suscripciones`: Gestión de planes y consumo.
4. `predios`: Polígonos y geometría por tenant (RLS habilitado).
5. `solicitudes_analisis`: Registro de solicitudes satelitales (RLS habilitado).
6. `mediciones`: Datos satelitales por solicitud/tenant (RLS habilitado).
7. `informes`: Generación e historial de reportes (RLS habilitado).
8. `consumo_mensual`: Control de cuota mensual por tenant (RLS habilitado).
9. `alertas`: Alertas agronómicas por tenant (RLS habilitado).
10. `api_keys`: Claves de API SHA-256 por tenant (RLS habilitado).
11. `workflow_logs`: Traza de ejecuciones n8n/workers (RLS habilitado).

### Políticas RLS:
- Todas las tablas de negocio incluyen la columna `tenant_id uuid NOT NULL`.
- Las políticas filtran utilizando la función helper `get_current_tenant_id()` que lee `app_metadata.tenant_id` del JWT.

---

## 5. Riesgos de Seguridad e Integridad Identificados
- **Credenciales en Frontend / Vite:** La plantilla Vite incluye lectura de entorno público `VITE_*`. Se debe garantizar que no se expongan llaves secretas ni claves service_role.
- **Identidad de Usuario / Metadata:** En el servidor Node/Express actual, la identidad lee claims desde context/cookies de desarrollo. En la transición a Supabase/FastAPI se debe forzar la lectura exclusiva desde `app_metadata` (no `user_metadata`).
- **Coexistencia Drizzle/MySQL y Supabase/Postgres:** Drizzle y MySQL2 están presentes en `package.json` para la persistencia stub en memoria/demo.

---

## 6. Inventario de Pantallas y Rutas
- `/`: Inicio y formulario de solicitud de análisis (`SolicitudAnalisisForm.tsx`). Usa datos estáticos/stubs con fallback determinista.
- `/dashboard/informes`: Centro operativo de informes (`ReportsDashboard.tsx`).
- `/dashboard/informes/:id`: Vista de detalle con gráfico de variables y trazabilidad (`ReportDetail.tsx`).
- `/dashboard/configuracion/satelites`: Configuración y explicación de fuentes satelitales (`SatelliteConfiguration.tsx`).

---

## 7. Estado de Verificación Operativa
- **Verificado:** Compilación TypeScript (`pnpm check`), batería de tests unitarios (`pnpm test` - 28/28 pasando), y empaquetado de producción (`pnpm build`).
- **No Verificado en Runtime Externo:** Conexión a instancia Supabase activa en la nube o ejecución de servicios n8n reales (por ausencia de credenciales externas en el entorno de evaluación).
