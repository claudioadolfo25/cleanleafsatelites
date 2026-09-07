

---

## Cleanleaf MVP — Alcance satelital

Cleanleaf es un SaaS de monitoreo para agricultura que traduce lecturas satelitales en decisiones simples para productores. El MVP está configurado para el piloto agrícola en La Araucanía y separa explícitamente dos decisiones de cada solicitud: el **tamaño del área**, que determina un tier de análisis, y la **fuente de datos**, que determina qué variables se consultan.

| Vertical | Fuentes habilitadas en el MVP | Uso principal |
| --- | --- | --- |
| Agricultura | Sentinel-2, Sentinel-1 | Vigor vegetal, humedad y respaldo ante nubosidad |
| Acuicultura | Sentinel-3, Sentinel-2 | Temperatura superficial y clorofila-a |
| Forestal | Sentinel-2, Sentinel-1 | Salud vegetal y monitoreo bajo nubosidad |

La regla de habilitación vive exclusivamente en `shared/satellite-catalog.ts`. La API valida todas las solicitudes contra ese catálogo antes de crear una operación. Por ejemplo, una solicitud agrícola que intenta usar Sentinel-3 se rechaza; una solicitud acuícola con Sentinel-3 se acepta.

### Variables simuladas y contrato de integración

La capa `shared/satellite-service.ts` contiene stubs deterministas que devuelven siempre el mismo contrato: `{ satelite, variable, valor, unidad, fecha_adquisicion }`. Sentinel-2 expone índices como NDVI, Sentinel-1 expone métricas radar como `sigma0_vv` y Sentinel-3 expone variables térmicas u oceánicas como `sst`. En una integración futura se reemplazará únicamente la implementación interna por el proveedor real, sin cambiar los consumidores de la API.

### Fuera de alcance

**Sentinel-4, Sentinel-5P y Sentinel-6 están explícitamente fuera del catálogo y fuera del alcance del producto.** Estas misiones se orientan a calidad de aire, química atmosférica o altimetría y no aportan valor directo al monitoreo de agricultura, acuicultura costera o forestal planteado por Cleanleaf. No deben agregarse como opciones activables sin una evaluación de producto independiente.

### Configuración opcional

El catálogo usa estos valores de respaldo cuando las variables de entorno no se definen:

```bash
CLEANLEAF_SATELITES_HABILITADOS_AGRICULTURA=sentinel-2,sentinel-1
CLEANLEAF_SATELITES_HABILITADOS_ACUICULTURA=sentinel-3,sentinel-2
CLEANLEAF_SATELITES_HABILITADOS_FORESTAL=sentinel-2,sentinel-1
```

### Validación

Ejecutar la batería de pruebas y la comprobación estática con:

```bash
pnpm test
pnpm check
```

## Buenas prácticas y límites del MVP

El frontend consume contratos tipados de tRPC y no contiene reglas de negocio de catálogo o tiers. La selección de satélites se filtra por vertical en una única fuente de verdad, y las consultas stub son asíncronas para mantener el mismo contrato que tendrá el proveedor real. Los tiers aprobados son: Tier 1 para menos de 50 ha, Tier 2 para 50–499 ha y Tier 3 desde 500 ha; en agricultura el Tier 3 queda visible como stub de contexto regional y no activa Sentinel-3 en el selector.

La capa `shared/interpretation.ts` prepara el prompt que recibirá Dify con `satelite`, `variable`, `valor` y `unidad`, y contiene una interpretación determinista de respaldo para NDVI y Sigma0 VV. `supabase/schema.sql` y `supabase/seed.sql` documentan la migración futura a Postgres/Supabase, con `tenant_id`, `get_current_tenant_id()` y políticas RLS por tenant. El seed incluye el caso de rechazo de Sentinel-3 para agricultura.

Queda fuera de esta fase, de forma intencional: integración real con Sentinel Hub, workflows n8n conectados, Stripe, WhatsApp y autenticación de API keys multi-tenant. Se deben integrar en Fase 2 reemplazando stubs sin cambiar los contratos públicos.

## Robustez de configuración satelital

El catálogo aplica una política **fail-safe** en dos capas. Primero, cada vertical tiene una allowlist de producto que no puede ampliarse mediante variables de entorno. Segundo, los valores desconocidos, duplicados o incompatibles se ignoran y el sistema vuelve al catálogo seguro por defecto si la configuración deja cero fuentes utilizables. Así, una configuración accidental como `CLEANLEAF_SATELITES_HABILITADOS_AGRICULTURA=sentinel-3` no habilita Sentinel-3: conserva Sentinel-2 y Sentinel-1 y expone un diagnóstico de advertencia.

La consulta `cleanleaf.configStatus` permite observar `configured`, `valid`, `effective` y `warnings`. El formulario de solicitud muestra la advertencia al operador, pero mantiene el flujo funcional con la configuración segura. Las pruebas cubren específicamente el intento de habilitar Sentinel-3 en agricultura y la presencia de valores desconocidos. Sentinel-4, Sentinel-5P y Sentinel-6 no forman parte del catálogo ni de ninguna opción activable.

## Arquitectura v7 y continuidad operativa

El MVP agrega un motor de enrutamiento por superficie en `shared/satellite-router.ts`. Tier 1 cubre hasta 50 ha y usa el modo `processing_api`; Tier 2 cubre más de 50 y hasta 5.000 ha y usa `statistical_api`; Tier 3 supera 5.000 ha, usa `batch_api` y requiere un plan que lo permita. Los límites son configurables mediante `CLEANLEAF_TIER1_MAX_HA` y `CLEANLEAF_TIER2_MAX_HA`, con fallback seguro.

La API versionada está representada por el namespace tRPC `apiV1`, con solicitudes, onboarding y generación de API keys stub. Los workflows `n8n/workflows/sentinel-weekly-update.json` y `n8n/workflows/sentinel-on-demand.json` documentan la integración futura sin activar llamadas externas. `supabase/schema.sql` y `supabase/seed.sql` contienen el modelo multi-tenant objetivo con planes, solicitudes, API keys, consumo, informes, alertas y políticas RLS.

El diagnóstico técnico y las instrucciones para la continuación quirúrgica están en `docs/v7-diagnostic.md` y `docs/JULES_HANDOFF.md`. Antes de producción se debe ejecutar RLS real en Supabase, persistir solicitudes y consumo, resolver sesión/API key por tenant, conectar n8n con secretos y sustituir los stubs por proveedores reales.
