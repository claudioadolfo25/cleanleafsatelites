# Informe de Auditoría de Ingeniería: Cleanleaf (Metodología gstack)

**Fecha:** 14 de Octubre de 2026
**Auditor:** Equipo de Auditoría de Ingeniería Cleanleaf (gstack framework)
**Repositorio:** `claudioadolfo25/cleanleafsatelites`
**Entorno Evaluado:** Local (Staging Static Analysis) + Production Live (`https://cleanleafsatelites.onrender.com`)

---

## 1. Resumen Ejecutivo

### Veredicto: PARCIALMENTE IMPLEMENTADO (Apto para Staging / Piloto Controlado; NO APTO para MVP Productivo Comercial)

La aplicación **Cleanleaf** cuenta con una arquitectura de monolito TypeScript moderna, estructurada e integra eficazmente los servicios REST v1/tRPC, el catálogo Copernicus STAC y la API de Open-Meteo. Sin embargo, no cumple con los criterios de seguridad y aislamiento multi-tenant requeridos para un MVP comercial en producción.

El fallo crítico principal radica en que **la clave pública anónima de Supabase (`supabaseAnonKey`) no está configurada en la API en vivo de Render (`live-health.log` reporta `supabaseAnonKey: false`)**, lo que degrada las consultas al modo de demostración estático o fallback sin persistencia ni validación JWT real contra la base de datos PostgreSQL. Asimismo, existen 164 vulnerabilidades reportadas por `pnpm audit` (6 críticas y 59 de alta severidad), y no existen tests integrados en CI para validar políticas RLS directas en PostgreSQL.

### Las 5 Acciones Más Urgentes:

1. **Configurar Variables Críticas en Render (Seguridad/Persistencia):** Inyectar `SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `OAUTH_SERVER_URL` en el panel de Render para permitir persistencia real y autenticación JWT multi-tenant activa.
2. **Remediación de Dependencias Críticas (Seguridad):** Ejecutar actualización de dependencias vulnerables (`express`/`body-parser`, `dompurify`, `mermaid`) para solucionar las 6 vulnerabilidades críticas y 59 de alta severidad.
3. **Suite de Tests RLS de PostgreSQL (QA/Seguridad):** Crear e integrar tests de integración RLS (`tests/rls.test.sql` o `vitest` con cliente pg real) que verifiquen el aislamiento estricto por `tenant_id` impidiendo cross-tenant data leaks.
4. **Protección de Enrutamiento en Frontend (UX/Seguridad):** Prevenir parpadeos y renders parciales en rutas protegidas (`/dashboard/*`) cuando las sesiones expiradas o nulas tardan en resolverse.
5. **Configuración de Pipeline CI/CD Automatizado:** Agregar GitHub Actions workflow para ejecutar `pnpm check`, `pnpm test` y `pnpm build` de forma obligatoria en cada Pull Request a `main`.

---

## 2. Semáforo por Área

| Área | Semáforo | Nota (0-10) | Resumen Justificativo |
| :--- | :---: | :---: | :--- |
| **1. Estrategia (/office-hours)** | 🟡 Amarillo | 6.5 / 10 | Resuelve el dolor real del agricultor (monitorea NDVI/clima), pero confunde alcance del MVP con dependencias de Fase 2 (n8n, Stripe, WhatsApp incompleto). |
| **2. Arquitectura (/plan-eng-review)** | 🟢 Verde | 8.0 / 10 | Monolito Express + Vite muy bien estructurado. Contiene la API y estáticos en un solo proceso Node.js en Render. |
| **3. Revisión de Código (/review)** | 🟢 Verde | 8.5 / 10 | Cero errores de compilación `tsc`. Tipado estricto en TypeScript. Buenas prácticas en `shared/` y `server/`. |
| **4. Seguridad (/cso)** | 🔴 Rojo | 4.0 / 10 | `supabaseAnonKey` ausente en el entorno en vivo. 164 vulnerabilidades en dependencias (6 críticas). Sin tests automáticos de políticas RLS. |
| **5. QA (/qa-only)** | 🟡 Amarillo | 6.0 / 10 | Suite de unit tests rápida (40/40 tests pasan en 2.0s), pero carece de tests E2E con Playwright e integración con DB real. |
| **6. Rendimiento (/benchmark)** | 🟢 Verde | 8.0 / 10 | Frontend compilado con chunks divididos (`vendor-charts`, `vendor-radix`). Carga de la API en vivo en < 100ms. |
| **7. UX/DX (/plan-devex-review)** | 🟡 Amarillo | 7.0 / 10 | Excelente DX local con pnpm, pero frena el onboarding la falta de variables en vivo y documentación dispersa entre Vercel/Render. |
| **8. Documentación (/document-release)** | 🟡 Amarillo | 6.5 / 10 | `AGENTS.md` y `docs/RENDER_ENV.md` son excelentes, pero existen restos históricos desactualizados referenciando Vercel. |

---

## 3. Tabla de Hallazgos

| ID | Severidad | Área | Archivo:Línea | Descripción | Evidencia | Recomendación | Esfuerzo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Crítica** | Seguridad | Entorno Render | `SUPABASE_ANON_KEY` está ausente en el servidor de producción Render. | `live-health.log`: `"supabaseAnonKey": false` | Configurar `SUPABASE_ANON_KEY` en el panel de Render. | **S** |
| **SEC-02** | **Crítica** | Seguridad | `package.json` | 164 vulnerabilidades en dependencias (6 críticas: RCE/Proto Pollution en `body-parser`, `dompurify`, `mermaid`). | `pnpm-audit.log`: `164 vulnerabilities found (6 critical, 59 high)` | Actualizar `express`, `dompurify` y `mermaid` a versiones parcheadas. | **M** |
| **SEC-03** | **Alta** | Seguridad | `supabase/schema.sql` | RLS activado pero sin pruebas automatizadas en CI que garanticen aislamiento de `tenant_id`. | `docs/JULES_HANDOFF.md` cita la necesidad de `tests/rls.test.sql` | Crear tests de integración SQL/pg para validar bloqueo cross-tenant. | **M** |
| **DOC-01** | **Media** | Docs | `README.md` | El README no documenta el despliegue en Render ni las variables requeridas en produción. | `README.md` no menciona `docs/RENDER_ENV.md` ni Render | Actualizar `README.md` con la arquitectura oficial de Render. | **S** |
| **QA-01** | **Media** | QA | `package.json:13` | Falta script y suite de pruebas End-to-End con Playwright para verificar navegación UI y autenticación. | `package.json` no incluye `@playwright/test` | Agregar Playwright y test E2E de login y visualización de parcelas. | **L** |
| **PERF-01**| **Baja** | Rendimiento| `vite.config.ts` | La app genera un bundle estático principal de ~500KB (`index-cg7ISrE_.js`). | `pnpm-build.log`: `index-cg7ISrE_.js 499.74 kB` | Ajustar `manualChunks` en Vite para refactorizar la carga diferida. | **M** |

---

## 4. Cobertura de la Auditoría

### Lo Evaluado Exitosamente:
- **Compilación e Inspección Estática:** `pnpm check` (TypeScript `tsc --noEmit`) verificado con 0 errores.
- **Suite de Pruebas Unitarias:** `pnpm test` (Vitest) ejecutado localmente: 6 archivos de test, 40 pruebas pasadas (100% éxito).
- **Proceso de Build:** `pnpm build` verificado (Vite + esbuild empaquetando backend en `dist/index.js` y cliente en `dist/public`).
- **Auditoría de Vulnerabilidades:** `pnpm audit` ejecutado revelando 164 vulnerabilidades.
- **Auditoría de Secretos:** Escaneo de secretos en el código fuente con `git grep` (ningún secreto duro expuesto en commit).
- **Sondeo en Vivo (Read-Only):** `curl` ejecutado contra la API en vivo en Render (`https://cleanleafsatelites.onrender.com`):
  - `GET /api/health` -> HTTP 200 OK
  - `GET /api/trpc/cleanleaf.dashboard` -> HTTP 200 OK (Devuelve JSON estructurado)
  - `GET /api/oauth/callback` -> HTTP 400 Bad Request (`code and state are required`)
  - `GET /api/nonexistent-route` -> HTTP 404 Not Found (`{"error":{"code":"NOT_FOUND","message":"API route not found"}}`)

### Lo No Evaluado y Motivo:
- **Ejecución de Navegador Headless / Playwright (`/qa` completo / `/design-review` visual):** No evaluado debido a que la descarga del binario de Chromium mediante Playwright/Bun requiere privilegios adicionales o conexión directa no disponible en el entorno del contenedor.
- **Seguridad en Tiempo de Ejecución/Contenedores (`/cso` interactivo):** No evaluado en modo dinámico por requerir Docker socket en el host de auditoría.
- **Modificación de Datos en Producción:** No evaluado por restricción de auditoría de solo lectura.

---

## 5. Estado de Pruebas y Cobertura

- **Pruebas Totales:** 40
- **Pasaron:** 40 (100%)
- **Fallaron:** 0
- **Tiempo de Ejecución:** ~2.0 segundos
- **Archivos de Test:**
  1. `server/catalog-client.test.ts` (2 tests) - PASÓ
  2. `server/copernicus.test.ts` (5 tests) - PASÓ
  3. `server/satellite-domain.test.ts` (27 tests) - PASÓ
  4. `server/auth.logout.test.ts` (1 test) - PASÓ
  5. `server/fase1-auth-config.test.ts` (2 tests) - PASÓ
  6. `server/app.test.ts` (3 tests) - PASÓ

### Regresiones Sugeridas para Implementar:
1. **Test RLS SQL Directo:** Validar que un usuario con `tenant_id = 'tenant-A'` no pueda consultar `predios` o `mediciones` donde `tenant_id = 'tenant-B'`.
2. **Test de Autenticación Fallida:** Probar la respuesta de la API cuando se envía un JWT manipulado o expirado a `/api/v1/solicitudes`.
3. **Test de Tiempos Límite (Timeout):** Verificar que la consulta a Copernicus CDSE devuelva una respuesta de fallback adecuada si la API externa tarda más de 10 segundos.

---

## 6. Plan de Corrección Priorizado

### Fase A: Bloqueantes para Producción (1-2 semanas)
- [ ] Inyectar variables de entorno faltantes en Render (`SUPABASE_ANON_KEY`, `OAUTH_SERVER_URL`).
- [ ] Ejecutar `pnpm audit fix` y actualizar dependencias vulnerables de la API (`express`, `dompurify`).
- [ ] Implementar suite de verificación de RLS en base de datos.

### Fase B: Estabilización y Calidad (2-4 semanas)
- [ ] Configurar GitHub Actions CI/CD para ejecutar `pnpm check && pnpm test && pnpm build` en cada PR.
- [ ] Añadir suite de pruebas End-to-End con Playwright para flujos críticos (Login, Creación de Solicitud de Análisis).
- [ ] Limpiar archivos de configuración residuales de Vercel y unificar la documentación en el `README.md`.

### Fase C: Preparación para Fase 2 (1-2 meses)
- [ ] Integración en producción con Sentinel Hub real y Copernicus CDSE Live keys.
- [ ] Automatización de flujos con n8n y pasarela de pagos Stripe.
- [ ] Optimización de bundles en Vite mediante code-splitting avanzado.

---

## 7. Checklist de Variables de Entorno para Render

| Variable | Estado en Vivo | Requerida | Propósito |
| :--- | :---: | :---: | :--- |
| `SUPABASE_URL` | 🟢 `true` | Sí | URL del proyecto Supabase Postgres |
| `SUPABASE_ANON_KEY` | 🔴 `false` | Sí | Clave anónima para cliente y RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | 🟡 No reportado | Opcional (Admin) | Clave de servicio para administración server-side |
| `COPERNICUS_CLIENT_ID` | 🟢 `true` | Sí | ID de cliente OAuth2 Copernicus CDSE |
| `COPERNICUS_CLIENT_SECRET` | 🟢 `true` | Sí | Secreto OAuth2 Copernicus CDSE |
| `OAUTH_SERVER_URL` | 🔴 Faltante en logs | Sí | URL base para callbacks OAuth |
| `JWT_SECRET` / `COOKIE_SECRET` | 🟡 Por verificar | Sí | Secreto para firma y validación de cookies JWT |

---

## 8. Logs y Evidencia Adjunta

Toda la evidencia de soporte se encuentra guardada en la carpeta `docs/gstack-audit/evidencia/`:
- `pnpm-check.log`: Verificación de compilación TypeScript.
- `pnpm-test.log`: Resultados de la suite de pruebas Vitest.
- `pnpm-build.log`: Log de compilación y empaquetado de producción.
- `pnpm-audit.log`: Listado completo de vulnerabilidades detectadas.
- `live-health.log`: Respuesta del endpoint `/api/health` en Render.
- `live-trpc-dashboard.log`: Respuesta de la API tRPC `/api/trpc/cleanleaf.dashboard` en Render.
- `live-oauth-callback.log`: Respuesta del endpoint `/api/oauth/callback`.
- `live-404.log`: Verificación de manejo de rutas inexistentes.
