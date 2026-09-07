# Cleanleaf — Guía quirúrgica para Jules

## Regla de trabajo

No cambiar contratos de dominio sin actualizar las pruebas. La interfaz estable de solicitudes debe conservar `tier`, `satelitesSolicitados`, `estado`, `motorUsado`, `tiempoEstimado` y el envelope `{ data, error }` para la API versionada.

El flujo demo actual agrega `variablesSolicitadas`, `correlationId`, `idempotencyKey`, `history` e `informe`. Tier 1 y Tier 2 llegan a informe base determinista; Tier 3 queda en `requiere_revision` y no consume cuota. La implementación real debe conservar estos semánticos aunque cambie la persistencia.

## Prioridad P0 — seguridad y persistencia

1. Crear el proyecto Supabase de staging y aplicar `supabase/schema.sql`.
2. Verificar que el schema se aplica dos veces sin errores de migración. Si se decide usar migraciones incrementales, separar las sentencias `create table` y constraints con nombres idempotentes.
3. Configurar Supabase Auth y el mecanismo de claims. El contrato actual espera `tenant_id` y `role` en los claims JWT; si se reemplaza por una función `SECURITY DEFINER` basada en identidad, actualizar las políticas y agregar una prueba de recursión RLS.
4. Ejecutar `supabase/seed.sql` en staging con usuarios Auth correspondientes.
5. Crear `tests/rls.test.sql` para comprobar que Tenant A no lee predios, mediciones, solicitudes, api_keys ni workflow_logs de Tenant B. Comprobar también que un super-admin puede leer cross-tenant únicamente con auditoría.
6. Implementar `resolveTenantFromRequest(req)` para sesión web o header `X-Cleanleaf-Key`. Nunca guardar API keys en claro; mostrar la key una sola vez y persistir únicamente SHA-256 con salt.

## Prioridad P1 — API y procesamiento

1. Convertir `apiV1` en rutas HTTP `/api/v1/*` o en un adaptador REST compatible con el gateway. Mantener el envelope `{ data, error }`.
2. Persistir `solicitudes_analisis` con `tenant_id`, geometría, hectáreas, tier, motor y estado.
3. Implementar `GET /api/v1/solicitudes/:id` para polling.
4. Implementar `POST /api/v1/sentinel/procesar` con autenticación interna para n8n. Debe generar mediciones stub idempotentes y cambiar estados en orden `pendiente → en_cola → procesando → completado/error`.
5. Persistir consumo mensual y hacer la validación de plan dentro de una transacción para evitar doble gasto por solicitudes concurrentes.
6. Implementar onboarding real: tenant, suscripción trial y primer usuario admin en una transacción o workflow compensatorio.

## Prioridad P1 — n8n y Dify

1. Importar `n8n/workflows/sentinel-weekly-update.json` y `sentinel-on-demand.json` en un workspace de staging.
2. Configurar credenciales n8n como secrets, nunca dentro del JSON.
3. Hacer que ambos workflows firmen sus requests y registren siempre éxito o fallo en `workflow_logs`.
4. Conectar Dify usando servidor-side secrets, timeout y fallback. El dashboard no debe romperse si Dify está caído.
5. Crear tres agentes: onboarding, interpretación y soporte. El agente de interpretación debe recibir `satelite`, `variable`, `valor`, `unidad`, `tier` y, para Tier 2/3, indicar que la lectura es agregada por sub-área.

## Prioridad P1 — Copernicus por sector

1. Usar `shared/copernicus-catalog.ts` como catálogo de producto. No habilitar un recurso solo porque exista en Copernicus; cada sector necesita una política explícita.
2. Implementar `src/lib/copernicus.ts` o equivalente server-side con OAuth2 client credentials, caché de token y timeout. Las credenciales deben vivir en secretos del servidor.
3. Conectar primero CDSE Statistical API para Sentinel-2 y Sentinel-1. Mantener el contrato de medición actual y guardar proveedor, colección, fecha, variable y unidad.
4. Para acuicultura, validar CMEMS antes de activar el recurso. Para CLMS, CEMS, CDS y CAMS crear pruebas de contrato y activarlos solo con un caso de uso aprobado.
5. Registrar consumo, errores de proveedor y latencia por fuente. Una caída de Copernicus debe dejar la solicitud en `error` con mensaje accionable, no bloquear el dashboard.

## Prioridad P2 — frontend y producción

1. Conectar `PredioMap` a Leaflet Draw y calcular hectáreas con una librería geoespacial validada antes de guardar.
2. Mostrar tier y tiempo estimado antes de enviar una solicitud.
3. Añadir pantalla de solicitudes con polling y estados.
4. Añadir onboarding de tenant, pantalla de API keys y panel super-admin auditado.
5. Usar code-splitting para reducir el chunk frontend superior a 500 kB.
6. Añadir Playwright o equivalente para login, creación de solicitud, cambio Sentinel-1/Sentinel-2 y bloqueo de Sentinel-3 en agricultura.

## Comandos de aceptación

```bash
pnpm test
pnpm check
pnpm build
```

Adicionalmente, con Supabase configurado:

```bash
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
psql "$SUPABASE_DB_URL" -f tests/rls.test.sql
```

## No hacer

No activar Sentinel Hub real, Stripe o WhatsApp en este PR. No permitir que una variable de entorno amplíe una allowlist satelital. No procesar Tier 3 automáticamente. No hacer cross-tenant desde un admin normal. No exponer secretos al frontend. No eliminar el caso de rechazo por plan ni las pruebas de configuración inválida.

## Prioridad P0 — cerrar el producto final

1. Persistir el informe base con fuentes, variables, periodo, hallazgos, recomendaciones y limitaciones. No entregar solo el valor NDVI.
2. Implementar `GET /api/v1/solicitudes/:id` y `GET /api/v1/informes/:id` con respuestas explicativas cuando el informe aún no está listo.
3. Usar `shared/analysis-state.ts` como referencia de transiciones y registrar actor, motivo, fecha y `correlation_id` en cada cambio.
4. Sustituir el store demo de idempotencia por una restricción única en Supabase y una transacción que proteja mediciones, consumo, informes y alertas.
5. Conservar Dify como capa posterior al informe determinista. Un fallo de Dify no puede impedir la entrega de datos, gráfico y recomendación base.
