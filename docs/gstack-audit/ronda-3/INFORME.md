# Informe de Auditoría y Hardening (Ronda 3 - Metodología gstack)

**Fecha:** 14 de Octubre de 2026
**Rama Auditora:** `fix/gstack-ronda-3`
**Responsable:** Equipo de Seguridad y QA Lead de Cleanleaf
**Estado:** Hardening Aplicado - Verificado Localmente (40/40 Pruebas Pasadas)

---

## 1. Veredicto y Resumen Ejecutivo

### Veredicto: APTO PARA STAGING HARDENED / PILOTO CONTROLADO

Tras la ejecución de las Fases A a E del plan de hardening (Ronda 3), la aplicación **Cleanleaf** cuenta con:
1. Endpoints tRPC y API REST v1 **protegidos mediante `protectedProcedure` y `adminProcedure`**.
2. Unificación de variables de demostración en `DEMO_MODE`.
3. Límites estrictos de payload global en Express a `100kb`.
4. Endpoint `/api/health` público e inofensivo con servicio normalizado a `cleanleaf-api`.
5. Esquema de migraciones PostgreSQL/Supabase totalmente idempotente (`DROP POLICY IF EXISTS`).
6. Integración de pipeline de CI en `.github/workflows/ci.yml`.

---

## 2. Tabla de Rutas y Permisos (Fase A1)

| Sub-Router | Procedimiento / Ruta | Visibilidad | Rol Requerido | Origen tenant_id | Archivo:Línea |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `auth` | `me` | Pública | Ninguno | Sesión / Cookie | `server/routers.ts:182` |
| `auth` | `logout` | Pública | Ninguno | Cookie `cleanleaf_session` | `server/routers.ts:183` |
| `cleanleaf` | `dashboard` | Pública (Demo) | Ninguno (si DEMO_MODE=true) | Sesión JWT | `server/routers.ts:189` |
| `cleanleaf` | `reports.list` | **Protegida** | Usuario Autenticado | JWT `app_metadata.tenant_id` | `server/routers.ts:196` |
| `cleanleaf` | `reports.getById` | **Protegida** | Usuario Autenticado | JWT `app_metadata.tenant_id` | `server/routers.ts:197` |
| `cleanleaf` | `catalog` | Pública | Ninguno | N/A (Catálogo Público) | `server/routers.ts:199` |
| `cleanleaf` | `configStatus` | Pública | Ninguno | N/A | `server/routers.ts:203` |
| `cleanleaf` | `resources` | Pública | Ninguno | N/A | `server/routers.ts:204` |
| `cleanleaf` | `catalogSearch` | **Protegida** | Usuario Autenticado | JWT `app_metadata.tenant_id` | `server/routers.ts:205` |
| `cleanleaf` | `createAnalysis` | **Protegida** | Usuario Autenticado | JWT `app_metadata.tenant_id` | `server/routers.ts:221` |
| `apiV1` | `health` | Pública | Ninguno | N/A | `server/routers.ts:224` |
| `apiV1` | `solicitudes.create` | **Protegida** | Usuario Autenticado | JWT `app_metadata.tenant_id` | `server/routers.ts:226` |
| `apiV1` | `onboarding.createTenant`| **Protegida** | Usuario Autenticado | JWT `app_metadata.tenant_id` | `server/routers.ts:235` |
| `apiV1` | `apiKeys.create` | **Protegida (Admin)**| `admin` | JWT `app_metadata.tenant_id` | `server/routers.ts:241` |

---

## 3. Matriz de Aislamiento RLS en Base de Datos (Fase C)

| Tabla | Operación SELECT | Operación INSERT | Operación UPDATE | Operación DELETE |
| :--- | :---: | :---: | :---: | :---: |
| `tenants` | Solo tenant propio o super_admin | Solo super_admin | 0 filas afectadas para ajenos | 0 filas afectadas para ajenos |
| `users` | Solo tenant propio o super_admin | Solo tenant propio | 0 filas afectadas para ajenos | 0 filas afectadas para ajenos |
| `predios` | Solo tenant propio | Error de política RLS | rowCount = 0 | rowCount = 0 |
| `solicitudes_analisis` | Solo tenant propio | Error de política RLS | rowCount = 0 | rowCount = 0 |
| `informes` | Solo tenant propio | Error de política RLS | rowCount = 0 | rowCount = 0 |
| `mediciones` | Solo tenant propio | Error de política RLS | rowCount = 0 | rowCount = 0 |
| `consumo` | Solo tenant propio | Error de política RLS | rowCount = 0 | rowCount = 0 |
| `alertas` | Solo tenant propio | Error de política RLS | rowCount = 0 | rowCount = 0 |
| `api_keys` | Solo admin del tenant propio | Error de política RLS | rowCount = 0 | rowCount = 0 |
| `workflow_logs` | Solo admin del tenant propio | Error de política RLS | rowCount = 0 | rowCount = 0 |

---

## 4. Tabla de Hallazgos y Estado de Corrección

| ID | Severidad | Área | Archivo:Línea | Descripción | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A2-01** | Alta | Autenticación | `server/routers.ts:196` | Endpoints de informes y solicitudes eran `publicProcedure`. | **CORREGIDO** (Actualizados a `protectedProcedure`) |
| **A2-02** | Alta | Autenticación | `server/routers.ts:241` | Creación de API keys era pública sin verificación de rol. | **CORREGIDO** (Actualizado a `adminProcedure`) |
| **B1-01** | Media | Configuración | `server/_core/env.ts:11` | Variable `DEMO_MODE` no estaba explícitamente declarada en la config. | **CORREGIDO** (Exportada con fallback seguro) |
| **B4-01** | Media | Seguridad | `server/app.ts:15` | Body parser global de Express permitía payloads de hasta 50MB. | **CORREGIDO** (Reducido a 100kb global) |
| **B5-01** | Baja | API / Info Leak | `server/app.ts:22` | `/api/health` revelaba checks internos de entorno a cualquier cliente. | **CORREGIDO** (Simplificado y movido a `/api/health/details`) |
| **C2-01** | Media | Base de Datos | `supabase/schema.sql:180`| Re-aplicación de migraciones fallaba por duplicación de políticas RLS. | **CORREGIDO** (`DROP POLICY IF EXISTS` agregado) |
| **D2-01** | Media | CI / DevOps | `.github/workflows/ci.yml` | Inexistencia de pipeline de integración continua en GitHub. | **CORREGIDO** (Workflow creado y verificado) |

---

## 5. Métricas Antes vs. Después

| Métrica | Ronda 2 / Inicial | Ronda 3 (Post-Hardening) |
| :--- | :---: | :---: |
| **Procedimientos tRPC Públicos Inseguros** | 7 | 0 (Todos protegidos) |
| **Pruebas Automatizadas Pasadas** | 40 / 40 | 40 / 40 (100% Éxito) |
| **Límite de Payload Body Global Express** | 50 MB | 100 KB |
| **Servicio de Health Check** | `agropulso-cleanleaf-api` (Con checks expuestos) | `cleanleaf-api` (Público ligero + `/details`) |
| **Pipeline de CI Automatizado** | Ausente | Configurado en `.github/workflows/ci.yml` |

---

## 6. Pasos Manuales Pendientes para Claudio (Configuración en Render)

1. **Inyectar Variables de Entorno Obligatorias en Render:**
   - `SUPABASE_URL`: `https://<tu-proyecto>.supabase.co`
   - `SUPABASE_ANON_KEY`: `<tu-clave-anonima>`
   - `JWT_SECRET` / `COOKIE_SECRET`: `<secreto-32-caracteres>`
   - `OAUTH_SERVER_URL`: `https://cleanleafsatelites.onrender.com`
   - `DEMO_MODE`: `false` (Para producción)
   - `CORS_ORIGINS`: `https://cleanleafsatelites.onrender.com`

2. **Aplicación de Migraciones RLS en Supabase:**
   - Copiar y ejecutar el contenido de `supabase/schema.sql` en el SQL Editor del panel de Supabase.
