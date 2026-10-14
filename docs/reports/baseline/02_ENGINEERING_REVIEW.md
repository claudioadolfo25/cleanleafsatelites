# Revisión Técnica de Ingeniería — Cleanleaf Satélites

**Modulo:** Revisión de Ingeniería Baseline
**Fecha:** Octubre 2026
**Auditor:** Jules (Ingeniería de Software / Diagnóstico Técnico)

---

## 1. Dislocación entre Código Real, Mocks, Stubs y Datos Sintéticos

### 1.1 Inventario de Componentes y su Clasificación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CÓDIGO REAL (Lógica)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ - Router tRPC apiV1 & cleanleaf (server/routers.ts)                         │
│ - Reglas de catálogo por vertical (shared/satellite-catalog.ts)            │
│ - Enrutamiento por superficie Tier 1, 2, 3 (shared/satellite-router.ts)     │
│ - Cliente STAC v1 Copernicus (server/stac-client.ts)                         │
│ - Proveedor CDSE Statistical API (server/copernicus.ts)                    │
│ - Formulario de solicitud y selectores (client/src/components/*)            │
│ - Generación de contratos exportables (client/src/components/ReportDownloadActions) │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MOCKS / STUBS / FALBACKS                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ - idempotencyStore (server/routers.ts): Map en memoria epímero.              │
│ - demoReports (shared/report-catalog.ts): 5 informes hardcododeados.        │
│ - demoDashboard (server/routers.ts): Métricas y predios estáticos.           │
│ - stableValue (shared/satellite-service.ts): Hash determinista de valores.  │
│ - CopernicusUnavailableProvider (server/routers.ts): Excepción al no haber secreto. │
│ - apiKeys.create & onboarding (server/routers.ts): Generadores simulados.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Análisis Detallado por Componente del Flujo

### 2.1 Autenticación y Contexto de Usuario
* **Archivo o componente:** `client/src/_core/hooks/useAuth.ts`, `server/_core/context.ts`, `server/_core/oauth.ts`.
* **Evidencia:**
  * En `server/_core/context.ts`:
    ```ts
    export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
      let user: User | null = null;
      try { user = await sdk.authenticateRequest(opts.req); } catch (error) { user = null; }
      return { req: opts.req, res: opts.res, user };
    }
    ```
  * En `server/_core/oauth.ts` se observa el mensaje de advertencia al arrancar: `[OAuth] ERROR: OAUTH_SERVER_URL is not configured!`.
  * En `client/src/pages/AuthPage.tsx` y `client/src/components/ProtectedRoute.tsx`, el frontend utiliza Supabase SDK JS leyendo `import.meta.env.VITE_SUPABASE_URL` y `import.meta.env.VITE_SUPABASE_ANON_KEY`.
* **Impacto:** Existe una desalineación de arquitectura. El frontend intenta autenticarse mediante Supabase Auth, pero el backend tRPC intenta validar cookies de Manus OAuth. El contexto de tRPC no recibe información del usuario de Supabase, de modo que `ctx.user` queda `null` o desvinculado del `tenant_id`.
* **Acción propuesta:** Actualizar `createContext` para verificar el token de Bearer de Supabase en los encabezados HTTP o usar las bibliotecas de cliente de Supabase para Node, estableciendo `ctx.user` y `ctx.tenantId`.

---

### 2.2 Creación de Solicitudes y Enrutamiento por Tier
* **Archivo o componente:** `server/routers.ts` (`createAnalysisRequest`), `shared/satellite-router.ts`.
* **Evidencia:**
  * Al recibir una solicitud, `createAnalysisRequest`:
    1. Valida la vertical contra `validarSatelitesSolicitados` (ej: Agricultura acepta Sentinel-1 y Sentinel-2; rechaza Sentinel-3).
    2. Calcula el Tier según la superficie:
       * Tier 1 (0,5–50 ha): `processing_api`
       * Tier 2 (50,01–5.000 ha): `statistical_api`
       * Tier 3 (>5.000 ha): `batch_api`
    3. Para Tier 1 y Tier 2, invoca `observationProvider.query()`.
    4. Guarda el resultado en `idempotencyStore` (`Map<string, unknown>`).
* **Impacto:** La validación de negocio es 100% robusta y está completamente probada en test unitarios. Sin embargo, la persistencia en `idempotencyStore` es en memoria local del proceso Express, sin conexión a base de datos.
* **Acción propuesta:** Preservar la lógica de validación e interconectar la salida de `createAnalysisRequest` con una tabla de base de datos (`solicitudes_analisis`).

---

### 2.3 Proveedor Satelital Copernicus CDSE vs Fallback
* **Archivo o componente:** `server/copernicus.ts` y `server/routers.ts`.
* **Evidencia:**
  * `CopernicusCDSEProvider` genera el evalscript para Sentinel-2 (NDVI, NDRE, NDMI, LSWI con máscara de nubes SCL) y Sentinel-1 (polarización VV/VH en dB).
  * Llama a `https://sh.dataspace.copernicus.eu/api/v1/statistics`.
  * Si la variable de entorno `COPERNICUS_CLIENT_SECRET` no está presente, `copernicusTokenManager.isConfigured()` retorna `false`.
  * En `server/routers.ts`, esto asigna `CopernicusUnavailableProvider`, el cual arroja un error al intentar consultar datos.
* **Impacto:** Sin la clave de API en el servidor, las consultas reales fallan de inmediato en lugar de degradarse con elegancia o usar el generador determinista `stableValue`.
* **Acción propuesta:** Implementar un fallback seguro que capture `CopernicusUnavailableError` y retorne un dato sintético con el atributo `data_source: "synthetic"`, evitando romper la experiencia del usuario final durante pruebas o demos.

---

### 2.4 Centro de Informes (`/dashboard/informes`)
* **Archivo o componente:** `client/src/pages/ReportsDashboard.tsx`, `client/src/pages/ReportDetail.tsx`, `shared/report-catalog.ts`.
* **Evidencia:**
  * `ReportsDashboard.tsx` ejecuta `trpc.cleanleaf.reports.list.useQuery(...)`.
  * `shared/report-catalog.ts` implementa:
    ```ts
    export function listReports(filters: ReportFilters = {}): ReportRecord[] {
      return demoReports.filter(...);
    }
    ```
* **Impacto:** Los informes visualizados provienen exclusivamente de `demoReports` (5 registros fijos). No hay ninguna relación entre las solicitudes creadas por el usuario en `SolicitudAnalisisForm` y la lista de informes mostrada en la pantalla.
* **Acción propuesta:** Reemplazar `demoReports` por un array dinámico respaldado por almacenamiento (o estado compartido) que combine los informes semilla con los informes generados por las solicitudes del usuario.

---

### 2.5 Exportación de Informes
* **Archivo o componente:** `client/src/components/ReportDownloadActions.tsx`.
* **Evidencia:**
  * Implementa 3 formatos:
    1. **Markdown (`.md`):** Genera string Markdown con resumen, recomendaciones, métricas y trazabilidad; dispara descarga Blob en el navegador.
    2. **Imprimir / PDF:** Ejecuta `window.print()`, utilizando CSS de impresión para maquetar el informe.
    3. **Word (`.doc`):** Genera HTML básico en un Blob con tipo MIME `application/msword`.
  * Botones condicionados a `report.status === "completado"`.
* **Impacto:** La capa de exportación está 100% funcional y probada para cualquier objeto de tipo `ReportRecord` que tenga estado `completado`.
* **Acción propuesta:** Mantener el componente sin modificaciones, utilizándolo como la etapa final del flujo de usuario.

---

## 3. Matriz de Riesgos y Dependencias

| Riesgo | Nivel | Causa Raíz | Mitigación |
|---|---|---|---|
| Perder solicitudes al reiniciar servidor | **Alto** | `idempotencyStore` en memoria | Migrar a almacenamiento persistente en Supabase |
| Bloqueo total al solicitar análisis | **Alto** | Ausencia de `COPERNICUS_CLIENT_SECRET` | Implementar fallback a dato sintético con insignia `synthetic` |
| Experiencia rota al crear informe y no ver el resultado | **Alto** | `cleanleaf.reports.list` lee `demoReports` estático | Unificar lista de informes con datos dinámicos |
| Violación de aislamiento multi-tenant | **Medio** | Backend tRPC ignora JWT de Supabase | Extraer `tenant_id` en middleware de tRPC |
