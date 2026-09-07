# DIAGNOSTICO_FLUJOS.md — Cleanleaf

**Fecha:** septiembre de 2026  
**Alcance:** aplicación del diagnóstico adjunto al MVP actual.  
**Resultado de validación:** 24 tests pasan, TypeScript pasa y build pasa.

## Decisión principal

El flujo demostrable queda definido como:

```text
UI → tRPC/apiV1 → validación de fuente/variable/tier/plan
→ proveedor EarthObservationProvider
→ medición normalizada
→ informe base
→ respuesta UI
```

El runtime actual sigue usando Drizzle/MySQL de la plantilla WebDev. Supabase/Postgres continúa siendo la persistencia oficial objetivo para staging y producción. No se mezclan escrituras entre ambos sistemas: la integración Supabase aún no está activada en runtime y está documentada como migración pendiente.

## Matriz de diagnóstico y acciones aplicadas

| Flujo | Estado actual | Desviación | Impacto | Causa | Solución aplicada | Archivos afectados | Criterio de aceptación | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Crear análisis | Funcional en modo demo | Antes terminaba en medición preview | No existía producto final | Stub acoplado al router | Ahora genera medición, interpretación e informe base para Tier 1/2 | `server/routers.ts`, `shared/observation-provider.ts` | Solicitud incluye `informe.estado=completado` | P0 |
| Tier regional | Antes podía quedar en pendiente conceptual | No había resultado accionable | Pantalla muerta y expectativa falsa | Falta de estado explícito | Tier 3 devuelve `requiere_revision`, sin medición ni consumo | `server/routers.ts`, `shared/analysis-state.ts`, formulario | Mensaje claro y no inicia procesamiento | P0 |
| Estado de solicitud | Parcial | No había transiciones formales | Reintentos y errores ambiguos | Estados declarados sin guardas | Máquina de estados con transiciones permitidas | `shared/analysis-state.ts` | Transición inválida lanza error explícito | P0 |
| Fuente y variable | Parcial | Selector permitía fuente sin variable | Riesgo de pedir `sst` a Sentinel-2 | Selección desacoplada | Formulario muestra variables por fuente y API valida compatibilidad | `client/src/components/SolicitudAnalisisForm.tsx`, `shared/analysis-validation.ts` | Error `INVALID_SATELLITE_VARIABLE` | P0 |
| Copernicus | Stub controlado | No hay OAuth2 ni CDSE real | No es aún dato productivo | Sin credenciales de staging | Se aisló detrás de `EarthObservationProvider` y `MockCopernicusProvider` | `shared/observation-provider.ts` | Sustituir proveedor sin cambiar consumidores | P1 |
| Idempotencia | Parcial demo | Reintentos podían duplicar resultado | Duplicación de mediciones/informes/consumo | No había clave de ejecución | Se agregó `idempotencyKey`, `correlationId` y store demo; schema agrega índice único objetivo | `server/routers.ts`, `supabase/schema.sql` | Repetir misma key devuelve el mismo resultado | P0 |
| Informe | Ausente como producto completo | Solo se mostraba dato técnico | Valor comercial incompleto | No había contrato de informe | Se creó `AnalysisReport` con periodo, fuentes, hallazgos, recomendaciones y limitaciones | `shared/observation-provider.ts` | Resultado contiene informe completo | P0 |
| Dify/JARVIS | Opcional por diseño | No bloquea medición | Menor interpretación automática si falla | Integración externa pendiente | Informe base determinista se genera antes de Dify | `shared/observation-provider.ts`, `shared/interpretation.ts` | Dify caído no impide informe base | P1 |
| Persistencia | Demo | No hay RLS real en runtime | No se puede declarar aislamiento productivo | Supabase no conectado | Se documentó separación MySQL demo/Supabase objetivo | `supabase/schema.sql`, `docs/JULES_HANDOFF.md` | Jules ejecuta RLS real y pruebas SQL | P0 |
| Workflows | Stubs JSON | No procesan todavía solicitudes reales | Estados no se actualizan por n8n | Falta auth/persistencia endpoint | Se mantienen workflows seguros y se documenta idempotencia, bloqueo y logs | `n8n/workflows/*`, `docs/JULES_HANDOFF.md` | Importación staging + endpoints autenticados | P1 |

## Camino aceptado en sandbox

1. El usuario completa predio, hectáreas, fuente y variable.
2. El router valida catálogo, variable y plan.
3. La superficie obtiene un tier configurable.
4. Tier 1/2 transita `pendiente → en_cola → procesando → completado`.
5. El proveedor mock devuelve una medición normalizada.
6. Se crea un informe base con interpretación, recomendación y limitación declarada.
7. Se conserva `correlationId` e `idempotencyKey`.
8. Una repetición con la misma key devuelve el mismo objeto.
9. Tier 3 transita `pendiente → requiere_revision` y no consume cuota.

## Pendientes que no se deben ocultar

El flujo todavía no es productivo porque no persiste solicitudes en Supabase, no ejecuta RLS real, no conecta OAuth2 CDSE, no tiene endpoint HTTP independiente para polling, no tiene n8n autenticado y no tiene pruebas E2E con navegador. Esos puntos quedan en la guía de Jules y deben cerrarse antes de afirmar que Cleanleaf está listo para clientes reales.

## Próximo orden quirúrgico

1. Ejecutar schema, seed y pruebas RLS en Supabase staging.
2. Persistir solicitudes, mediciones, informes, consumo y logs bajo un mismo `tenant_id`, `solicitud_id` y `correlation_id`.
3. Convertir el proveedor mock en adaptador CDSE OAuth2 server-side con timeout y fallback.
4. Conectar n8n con autenticación, lock, retry acotado e idempotencia de base de datos.
5. Crear pantalla de solicitudes/informes con polling, reintento y descarga.
6. Añadir E2E del recorrido completo y del aislamiento entre tenants.
