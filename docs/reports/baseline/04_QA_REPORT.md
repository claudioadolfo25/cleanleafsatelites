# Informe de Control de Calidad (QA) — Cleanleaf Satélites

**Fecha:** Octubre 2026
**Entorno de Ejecución:** Sandbox Aislado (Linux x86_64, Node v22.22.1, pnpm 10.4.1)
**Evaluador:** Jules (QA & Software Engineering)

---

## 1. Registro de Verificaciones Ejecutadas en Entorno Aislado

Se ejecutaron de forma segura las herramientas de comprobación estática, pruebas unitarias y empaquetado del proyecto. Ningún servicio externo o de producción fue contactado.

### 1.1 Comprobación de Tipos y Sintaxis (`pnpm check`)
* **Comando:** `pnpm check` (`tsc --noEmit`)
* **Resultado:** **EXITOSO (0 errores)**
* **Detalle:** El compilador de TypeScript procesó la totalidad del código en `client/`, `server/`, `shared/` y `supabase/` sin encontrar errores de tipo o tipos no resueltos.

---

### 1.2 Suite de Pruebas Automatizadas (`pnpm test`)
* **Comando:** `pnpm test` (`vitest run`)
* **Resultado:** **EXITOSO (6 de 6 archivos de prueba pasados, 40 de 40 tests pasados)**
* **Tiempo de ejecución:** 2.09 segundos.
* **Desglose de Test Suites:**

| Archivo de Prueba | Tests | Estado | Observación |
|---|---|---|---|
| `server/catalog-client.test.ts` | 2 | PASSED | Valida cliente STAC v1 y manejo de filtros |
| `server/copernicus.test.ts` | 5 | PASSED | Valida TokenManager, modo fallback y manejo de errores CDSE |
| `server/satellite-domain.test.ts` | 27 | PASSED | Valida catálogo por vertical, tiers, validación de variables e interpretación |
| `server/auth.logout.test.ts` | 1 | PASSED | Valida eliminación de cookie en logout |
| `server/fase1-auth-config.test.ts` | 2 | PASSED | Valida configuración de Auth Fase 1 y Supabase |
| `server/app.test.ts` | 3 | PASSED | Valida respuesta Express, endpoint `/api/health` y respuesta tRPC 200 JSON |

---

### 1.3 Empaquetado y Compilación de Producción (`pnpm build`)
* **Comando:** `pnpm build` (`vite build && esbuild server/_core/index.ts ...`)
* **Resultado:** **EXITOSO**
* **Salidas generadas:**
  * Client Single Page Application en `dist/public` (2,441 módulos transformados en 8.14s).
  * Servidor Node.js empaquetado en `dist/index.js` (79.8 kB generados en 13 ms).

---

## 2. Hallazgos de QA e Impacto en la Experiencia de Usuario

### QA-01: Desconexión Visual del Flujo de Creación de Informe
* **Archivo / Componente:** `client/src/components/SolicitudAnalisisForm.tsx` & `client/src/pages/ReportsDashboard.tsx`.
* **Evidencia:** Al presionar "Solicitar Análisis", el sistema muestra un mensaje emergente "Análisis creado". Sin embargo, al navegar a la pantalla `/dashboard/informes`, el nuevo informe no aparece listado en la pantalla de "Mis Informes".
* **Impacto:** **Alto.** Rompe la expectativa fundamental del usuario: solicitar un informe y poder consultar el resultado o descargarlo.
* **Acción propuesta:** Conectar el retorno de la mutación de análisis con el estado de la lista de informes o almacenarlo en la persistencia.

---

### QA-02: Manejo de Excepción en la Consulta de CDSE sin Credenciales
* **Archivo / Componente:** `server/copernicus.ts` (línea 175) & `server/routers.ts`.
* **Evidencia:** Cuando `COPERNICUS_CLIENT_SECRET` no está configurado, `CopernicusUnavailableProvider.query()` lanza un error no capturado que provoca que la mutación tRPC responda con un HTTP 500 / error de servidor.
* **Impacto:** **Alto.** El usuario experimenta un fallo completo al enviar el formulario si el entorno no dispone de la clave secreta de Copernicus.
* **Acción propuesta:** Capturar `CopernicusUnavailableError` en el servidor y degradar a un dato sintético con la marca `data_source: "synthetic"`, asegurando que la prueba de usuario no se interrumpa.

---

### QA-03: Caso de Borde en Tier 3 Regional (>5.000 ha)
* **Archivo / Componente:** `shared/satellite-router.ts` & `server/routers.ts` (línea 112).
* **Evidencia:** Las solicitudes con superficie superior a 5.000 hectáreas asignan la categoría `tier3_regional` y devuelven el estado `requiere_revision` con el mensaje *"Este análisis regional requiere evaluación antes de consumir cuota"*.
* **Impacto:** **Medio.** No existe una pantalla o botón administrativo para aprobar o liberar esta revisión, dejando la solicitud en estado de espera permanente.
* **Acción propuesta:** Añadir una acción simulada o botón en la vista de detalle del informe que permita al administrador o agronómo aprobar manualmente el informe regional para avanzar a `completado`.

---

## 3. Registro Explícito de lo No Comprobado (Out of Scope / Non-Tested)

1. **Despliegue activo en Render:** No se ha enviado ningún commit a la rama `main` ni verificado el comportamiento directo sobre la URL `https://cleanleafsatelites.onrender.com`.
2. **Llamadas HTTP reales a la API de Copernicus Data Space Ecosystem:** No se han realizado peticiones activas a los endpoints oficiales de CDSE (`sh.dataspace.copernicus.eu`) con tokens reales de producción.
3. **Persistencia en base de datos remota Supabase:** No se han ejecutado inserciones sobre las tablas reales de la base de datos Supabase en la nube.
