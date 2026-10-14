# Resumen Ejecutivo del Diagnóstico Base — Cleanleaf Satélites

**Proyecto:** Cleanleaf Satélites (`claudioadolfo25/cleanleafsatelites`)
**Fecha:** Octubre 2026
**Fase:** Fase 1 — Inspección y Diagnóstico (Sin cambios en código, DB o infraestructura)
**Metodología:** Diagnóstico basado en evidencia inspirado en principios gstack, ejecutado por agente Jules.

---

## 1. Visión General del Proyecto

Cleanleaf es un SaaS de monitoreo agrícola para el piloto en La Araucanía que traduce imágenes satelitales (Sentinel-2, Sentinel-1, Sentinel-3) en decisiones para productores. El objetivo prioritario de este diagnóstico es evaluar el estado real de la plataforma y trazar el flujo completo del usuario hasta obtener un **informe satelital consultable y exportable**.

---

## 2. Diagnóstico del Flujo End-to-End

```
[1. Autenticación] ──> [2. Consulta/Solicitud] ──> [3. Procesamiento] ──> [4. Visualización] ──> [5. Exportación]
      (PARCIAL)             (OPERATIVO)                (MOCK/IN-MEM)          (DESCONECTADO)          (FUNCIONAL)
```

1. **Autenticación (Parcial):**
   * **Estado:** El frontend dispone de pantalla de autenticación (`/auth`) integrada con Supabase (Email/Password, OTP SMS, Google OAuth).
   * **Bloqueo:** El backend tRPC no valida ni requiere el JWT de Supabase en las rutas de consulta e informes, permitiendo acceso público anónimo cuando `DEMO_PUBLIC_DASHBOARD` es verdadero.

2. **Consulta / Solicitud de Análisis (Operativo):**
   * **Estado:** El formulario `SolicitudAnalisisForm` valida la superficie (ha), enruta el tier (Tier 1 <=50ha, Tier 2 <=5000ha, Tier 3 >5000ha) y comprueba la compatibilidad de satélites según la vertical (ej. rechaza Sentinel-3 para agricultura).
   * **Resultado:** La solicitud procesa la regla de negocio correctamente y genera un objeto de respuesta con estado `completado` o `requiere_revision`.

3. **Procesamiento de Lecturas (In-Memory / Mock):**
   * **Estado:** Las solicitudes procesadas se almacenan en una estructura `Map` en memoria (`idempotencyStore`).
   * **Bloqueo:** No hay persistencia en base de datos. Si no está configurado `COPERNICUS_CLIENT_SECRET`, el sistema invoca `CopernicusUnavailableProvider`, impidiendo la generación de mediciones reales en producción.

4. **Visualización de Informes (Desconectado):**
   * **Estado:** La pantalla "Mis Informes" (`/dashboard/informes`) consulta `cleanleaf.reports.list`.
   * **Bloqueo:** La API devuelve un arreglo estático e inmutable (`demoReports`). Las solicitudes recién creadas por los usuarios **no aparecen** en la lista de informes ni se pueden seleccionar para ver su detalle.

5. **Exportación de Informes (Funcional en Mocks):**
   * **Estado:** Los componentes de exportación (`ReportDownloadActions.tsx`) permiten descargar en formatos Markdown (`.md`), Word (`.doc`) e Imprimir/PDF (`window.print()`).
   * **Desempeño:** Funciona correctamente para los 5 informes mock preexistentes cuando están en estado `completado`.

---

## 3. Cuadro Resumen de Hallazgos Principales

| ID | Área / Componente | Evidencia | Impacto | Acción Propuesta |
|---|---|---|---|---|
| **EXEC-01** | **Persistencia de Informes** (`server/routers.ts`) | `reports.list` llama a `demoReports` estático. | Las nuevas solicitudes no aparecen en el Dashboard del usuario. | Conectar `solicitudes` e `informes` a tabla Supabase Postgres. |
| **EXEC-02** | **Integración Copernicus** (`server/copernicus.ts`) | `COPERNICUS_CLIENT_SECRET` ausente retorne error en `query()`. | Fallo en producción al solicitar análisis real. | Cargar secreto o definir fallback sintético explícito. |
| **EXEC-03** | **Autenticación Backend** (`server/_core/context.ts`) | `createContext` usa cookie Manus en vez de token Supabase. | Ausencia de aislamiento multi-tenant RLS real en tRPC. | Pasar token de Supabase en headers tRPC y validar tenant_id. |
| **EXEC-04** | **Límite de Tier 3 Regional** (`shared/satellite-router.ts`) | Tier 3 marca `requiere_revision` sin flujo de aprobación. | Solicitudes >5000 ha quedan atascadas indefinidamente. | Crear botón o acción admin para aprobar o rechazar Tier 3. |

---

## 4. Plan Recomendado de 3 Pasos Pequeños (Bajo Riesgo)

1. **Paso 1 (Conectar Persistencia Local):** Crear un almacenamiento ligero o conectar Supabase para que las solicitudes creadas por `SolicitudAnalisisForm` se inserten y puedan ser consultadas por `cleanleaf.reports.list`.
2. **Paso 2 (Asegurar Fallback de Copernicus):** Configurar el proveedor para que ante la falta de `COPERNICUS_CLIENT_SECRET` entregue un resultado sintético debidamente etiquetado (`data_source: "synthetic"`), garantizando la continuidad operativa.
3. **Paso 3 (Unificar Contexto de Usuario):** Extraer el `tenant_id` y `user_id` desde el token JWT de Supabase en el contexto de tRPC para garantizar aislamiento entre clientes.

---

## 5. Decisiones que Requieren Aprobación del Propietario

1. **Aprobación de Credenciales Copernicus:** ¿Se ingresarán las credenciales de producción de CDSE (`COPERNICUS_CLIENT_SECRET`) en Render o se mantiene el modo sintético determinista para la demo?
2. **Estrategia de Base de Datos:** ¿Se aprueba conectar el backend directamente a Supabase Postgres utilizando `@supabase/supabase-js` con `SUPABASE_SERVICE_ROLE_KEY`?
3. **Flujo de Registro de Nuevos Usuarios:** ¿Se debe exigir autenticación obligatoria antes de ingresar al formulario de solicitud (`/`) o mantener el dashboard público demostrativo?
