# Modo Estricto de Producción (Copernicus CDSE)

Este documento describe la arquitectura, variables de entorno y política de operación estricta para clientes de pago en la plataforma **Cleanleaf / AgroPulso**.

---

## Directiva de Negocio

Un cliente de pago debe recibir **exclusivamente datos reales de Copernicus CDSE** (Sentinel-2, Sentinel-1, Sentinel-3) o un **error explícito visible**.
Bajo ninguna circunstancia se presentará un resultado sintético, simulado o demo como si fuera información real del cliente.

---

## Variables de Control y Flags

Para activar el modo estricto en los servicios de Render (Staging y Producción), se utilizan dos variables complementarias que deben estar configuradas simultáneamente:

| Variable | Valor de Producción | Descripción |
| :--- | :--- | :--- |
| `COPERNICUS_STRICT_MODE` | `true` | **Interruptor Maestro Estricto.** Garantiza la validación de credenciales al arrancar (boot-check) y desactiva todos los fallbacks sintéticos en API y Workers. |
| `COPERNICUS_PROD_POLICY` | `live` | **Política Operativa del Motor.** Asegura que las fallas de CDSE resulten en `error_final` sin persisitir ni retornar puntos sintéticos en la serie temporal. |
| `COPERNICUS_MODE` | `live` | **Modo de Consulta Satelital.** Habilita las peticiones a la API Estadística y Catálogo STAC de Copernicus CDSE. |

---

## Unificación en el Código Fuente

El código fuente (`server/services/copernicus-policy-service.ts`, `server/routers.ts`, `server/services/analysis-worker.ts`) trata `COPERNICUS_STRICT_MODE=true` como equivalente a `COPERNICUS_PROD_POLICY=live`:

1. **Boot-Check de Credenciales (`server/_core/env.ts` / `server/app.ts` / `server/worker.ts`)**:
   Si `COPERNICUS_STRICT_MODE=true` y faltan `COPERNICUS_CLIENT_ID` o `COPERNICUS_CLIENT_SECRET`, el proceso **falla inmediatamente al iniciar** con `throw new Error(...)` y la ruta `/api/health` responde HTTP 503 Service Unavailable.

2. **Desactivación de Fallback Sintético (`server/copernicus.ts` / `server/routers.ts`)**:
   Se elimina `FallbackObservationProvider` del flujo de ejecución, consultando `CopernicusCDSEProvider` de manera directa. Si CDSE no responde o falla, se lanza una excepción explícita (`TRPCError` con código `THIRD_PARTY_ERROR`) o la solicitud transiciona a `error_final`.

3. **Búsqueda en Catálogo STAC (`server/routers.ts`)**:
   Ante errores de consulta en la búsqueda de imágenes, el endpoint `catalogSearch` no retorna el ítem de simulación `S2A_MSIL2A_STAC_CATALOG_MOCK_01`, sino un error `THIRD_PARTY_ERROR` visible.

4. **Dashboard y Reportes sin Datos (`server/db/repository.ts`)**:
   Si un tenant no cuenta con mediciones reales o informes en la base de datos, `getDashboardDataDb` responde con arreglos vacíos `[]` y métricas en cero, sin inyectar gráficos demo de agosto/septiembre.

5. **Formulario sin Predios (`client/src/components/SolicitudAnalisisForm.tsx`)**:
   Si un usuario no posee predios registrados, el botón de envío permanece deshabilitado con el mensaje y tooltip `"Cree un predio primero."`, evitando solicitudes hacia `"predio-demo-las-quinas"`.

6. **Trazabilidad en `audit_logs` (`server/services/analysis-worker.ts`)**:
   Cada llamada hacia Copernicus CDSE es registrada en la tabla `audit_logs` con `action: "copernicus.cdse_query"`, registrando `tenant_id`, `predio_id`, satélite, variable, latencia en ms, código de estado y resultado.
