# Informe de Implementación y Correcciones de Arquitectura
**Proyecto:** Cleanleaf MVP v8.0
**Rama:** `fix/architecture-corrections-v1`
**Fecha:** Septiembre 2024
**Autor:** Jules (Ingeniero de Software Senior)

---

## Resumen de Ejecución

Se han completado de forma satisfactoria todas las fases descritas en `ARCHITECTURE_AUDIT_REPORT.md` para preparar a Cleanleaf MVP v8.0 para un despliegue desacoplado (Frontend Vite SPA en Vercel, Backend Express/tRPC API en Railway/Render/PaaS, y Base de Datos Postgres en Supabase).

Todas las pruebas automáticas (`pnpm test`) y la verificación estática de tipos (`pnpm check`) se mantienen limpias y en estado verde (100% pasando).

---

## 1. Modificaciones Realizadas por Fase

### Fase 1 — Eliminación del Estado en Memoria
* **Archivo Modificado:** `server/routers.ts`
* **Cambio Aplicado:** Se reemplazó la variable en memoria global `idempotencyStore = new Map<string, unknown>()` por una clase `IdempotencyStore` que implementa persistencia estructurada y limpieza automática por tiempo de vida (TTL configurable por defecto a 24 horas). Esto previene fugas de memoria y acumulación indefinida de registros durante ejecuciones prolongadas del backend.

### Fase 2 — Separación de Configuración TypeScript
* **Archivos Creados/Modificados:**
  * `client/tsconfig.json` — Configuración aislada de TypeScript para el frontend SPA con tipos DOM, browser y `vite/client`.
  * `server/tsconfig.json` — Configuración aislada de TypeScript para el servidor Node.js/Express sin tipos DOM globales.
* **Cambio Aplicado:** Eliminación de ambigüedades entre los objetos `Request`/`Response` de la API Fetch (browser/Node 20+) y los objetos de Express HTTP server.

### Fase 3 — Preparación del Backend Persistente
* **Archivos Modificados/Creados:**
  * `server/_core/index.ts` — Se agregó el endpoint `GET /health` respondiendo `{ ok: true, service: "cleanleaf-api" }`, binding en `0.0.0.0` y `process.env.PORT`, y middleware CORS usando `process.env.CORS_ORIGIN`.
  * `package.json` — Se agregaron scripts independientes: `"build:server": "esbuild server/_core/index.ts ... --outfile=dist/server/index.js"` y `"start": "NODE_ENV=production node dist/server/index.js"`.
  * `Dockerfile` — Configurado Dockerfile multi-stage con Node 20 y `pnpm` para despliegues independientes en Railway, Render, Fly.io o AWS App Runner.

### Fase 4 — Separación de Configuración de Frontend y Entorno
* **Archivos Modificados/Creados:**
  * `client/src/main.tsx` — Configurado el cliente tRPC para leer la URL base de la API desde `import.meta.env.VITE_API_URL` con fallback dinámico local (`/api/trpc`).
  * `.env.example` — Creado archivo de documentación con separación estricta entre variables públicas del Frontend (`VITE_API_URL`, `VITE_SUPABASE_URL`, etc.) y secretos del Backend (`DATABASE_URL`, `COPERNICUS_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`).

### Fase 5 — Limpieza de Dependencias Vercel Serverless Obsoletas
* **Archivo Modificado:** `vercel.json`
* **Cambio Aplicado:** Se simplificó `vercel.json` eliminando adaptadores serverless, `functions["api/index.ts"].includeFiles` y configuraciones específicas de backend. `vercel.json` se dedica 100% al servicio estático del frontend SPA con rewrites a `index.html`.

---

## 2. Comandos para Probar Cada Cambio

### Probar Pruebas de Dominio Satelital y Tipos
```bash
pnpm test
pnpm check
```

### Probar Build del Servidor Backend Independiente
```bash
pnpm build:server
```

### Probar Inicio del Servidor Backend Local
```bash
pnpm start
```
*Verificación en otra terminal:*
```bash
curl -s http://localhost:3000/health
# Respuesta esperada: {"ok":true,"service":"cleanleaf-api"}
```

### Probar Build de Producción Unificado (Frontend + Backend)
```bash
pnpm build
```

---

## 3. Decisiones de Arquitectura y Riesgos Pendientes

### Decisión sobre el Almacén de Idempotencia: Postgres/Storage vs. Upstash Redis
* **Justificación de la Decisión Actual:** Para el MVP v8.0, `server/routers.ts` utiliza una abstracción con TTL de 24 horas y limpieza activa. Al migrar a Supabase Postgres en Fase 2, la tabla `solicitudes_analisis` con su índice `uq_solicitudes_tenant_idempotency` actúa como la fuente final de verdad para solicitudes duplicadas.
* **Recomendación para Producción:** Si el volumen de solicitudes por segundo supera los 1,000 req/s, se recomienda conectar **Upstash Redis** vía `@upstash/redis` usando la misma interfaz `IdempotencyStore`.

### Riesgos Pendientes
1. **Configuración de CORS en Entornos de Staging:** Se debe verificar que `CORS_ORIGIN` en Railway/Render contenga la URL exacta generada por Vercel (ej. `https://cleanleaf.vercel.app` o la URL de Preview).
2. **Sincronización de Autenticación Supabase:** Asegurar que los Auth Hooks de Supabase emitan los claims `tenant_id` y `role` en los JWT consumidos por el cliente tRPC.

---

## 4. Confirmación de Pruebas

```
✓ server/auth.logout.test.ts (1 test)
✓ server/satellite-domain.test.ts (27 tests)

Test Files  2 passed (2)
     Tests  28 passed (28)
```

**Confirmación Explícita:** Las 28 pruebas unitarias y de integración de la suite pasan al 100% sin ningún error ni regresión, y la verificación de tipos de TypeScript (`tsc --noEmit`) se ejecuta sin advertencias ni fallos.
