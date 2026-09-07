# Diagnóstico técnico de Cleanleaf después de aplicar v7

**Checkpoint de referencia:** `d35c9322` antes de esta iteración.  
**Objetivo de esta iteración:** acercar el MVP a una arquitectura operable y preparada para Jules sin integrar todavía Sentinel Hub, Stripe, WhatsApp ni n8n real.

## Estado general

Cleanleaf quedó como un MVP funcional de demostración sobre la plantilla WebDev de Manus. El frontend tiene un dashboard responsive y un flujo de solicitud satelital. La capa compartida contiene catálogo, fail-safe, interpretación, motor de tiers y límites de plan. La API tRPC expone un namespace `apiV1` con envelopes `{ data, error }` y stubs de onboarding, solicitudes y API keys.

El proyecto **no debe declararse todavía producción-ready**. La persistencia operativa continúa siendo la de la plantilla WebDev. Los artefactos Supabase y n8n son objetivos de integración y contratos de Fase 2. La seguridad de configuración satelital está reforzada, pero el aislamiento multi-tenant requiere ejecutar Supabase y sus pruebas SQL reales.

## Cambios ejecutados

| Área | Implementación | Estado |
| --- | --- | --- |
| Enrutamiento por superficie | `shared/satellite-router.ts` con límites configurables y modos `processing_api`, `statistical_api`, `batch_api` | Implementado como stub |
| Límites por plan | `shared/plan-limits.ts` con planes piloto, regional PyME y región completa | Implementado en memoria |
| API versionada | `apiV1.health`, `apiV1.solicitudes.create`, `apiV1.onboarding.createTenant`, `apiV1.apiKeys.create` | Contrato stub funcional |
| Configuración satelital | Allowlist fail-safe por vertical y diagnóstico `configStatus` | Implementado |
| Interpretación | Prompt y fallback para Sentinel-2, Sentinel-1 y Sentinel-3 | Stub determinista |
| Supabase | Schema completo objetivo con tenants, users, planes, suscripciones, solicitudes, mediciones, informes, consumo, alertas, api_keys y logs | Artefacto de migración |
| Seed | Dos clientes, usuarios admin/viewer, super-admin de Ops, planes, predios, solicitudes y mediciones | Artefacto de prueba |
| n8n | Workflow semanal y workflow bajo demanda con rama por tier | JSON stub, no conectado |
| Copernicus | Catálogo por sector y necesidad con CDSE MVP y CMEMS/CLMS/CEMS/CDS/CAMS en Fase 2 | Contrato de producto; OAuth2 y APIs reales pendientes |
| Tests | Dominio satelital, fail-safe, contrato de medición, interpretación, plan-limits y API v1 | Suite local |

## Validación ejecutada

La validación obligatoria para esta iteración es:

```bash
pnpm test
pnpm check
pnpm build
```

El build previo a la integración de v7 pasó correctamente. Tras completar los archivos v7, Jules debe volver a ejecutar los tres comandos y corregir cualquier divergencia de entorno. El bundle frontend emite una advertencia de tamaño de chunk superior a 500 kB; no bloquea el MVP, pero debe resolverse con code-splitting antes de producción.

## Riesgos abiertos

La autenticación real de `apiV1` todavía no resuelve sesión Supabase o `X-Cleanleaf-Key` hacia un tenant. El stub de API key genera un valor y un hash para demostrar el contrato, pero no persiste ni valida keys.

El `schema.sql` usa claims JWT para `get_current_tenant_id()` y una función separada para el rol. Esta decisión evita lecturas recursivas durante RLS en el artefacto actual. Jules debe conectar un Auth Hook de Supabase que emita `tenant_id` y `role`, o migrar a una función `SECURITY DEFINER` respaldada por una tabla de identidad. No se deben mezclar ambas estrategias sin pruebas.

Los workflows n8n llaman endpoints de ejemplo. No contienen credenciales ni deben activarse sin configurar secretos y autenticación entre n8n y la API.

El frontend sigue llamando tRPC directamente. La ruta `apiV1` existe como contrato versionado, pero todavía no es un conjunto de rutas HTTP REST independientes.

## Diagnóstico de operación satelital

La ruta de solicitud tiene tres barreras. Primero, valida que la vertical permita los satélites pedidos. Segundo, calcula el tier por superficie. Tercero, bloquea el tier regional si el plan no tiene `permiteTier3Regional` o si se supera el consumo mensual. Sentinel-4, Sentinel-5P y Sentinel-6 no pueden aparecer por configuración.

El Tier 1 se enruta a `processing_api`, el Tier 2 a `statistical_api` y el Tier 3 a `batch_api`. El Tier 3 se devuelve como `pendiente` y no se libera automáticamente. Esta decisión evita saturar la cola con una solicitud regional.

## Diagnóstico Copernicus

Copernicus quedó modelado como un catálogo de recursos y no como una simple lista de misiones. Para agricultura, CDSE Statistical API es la fuente activa del MVP y cubre índices vegetales y radar mediante el contrato existente. Para acuicultura, CMEMS aparece como recurso futuro para temperatura, clorofila, corrientes y nivel del mar. CLMS, CEMS, CDS y CAMS quedan visibles como capacidades de fase 2 para tierra, emergencias, clima y atmósfera. Ningún recurso futuro se activa por configuración accidental.

La propuesta Copernicus incluye afirmaciones de cuota y endpoint que deben verificarse contra la cuenta y documentación vigentes antes de producción. Esta iteración no crea credenciales ni realiza llamadas externas. Jules debe implementar OAuth2 server-side, caché de token, timeouts, reintentos acotados, logging de proveedor y límites de consumo antes de reemplazar los stubs.

## Recomendación de salida a producción

La secuencia correcta es: primero conectar Supabase y ejecutar RLS real; después implementar `resolveTenantFromRequest` para sesión y API key; luego persistir solicitudes y consumo; después conectar n8n con autenticación; y solo entonces sustituir los stubs por Sentinel Hub. La optimización visual y el code-splitting deben ejecutarse en paralelo, pero no sustituyen la validación de aislamiento.
