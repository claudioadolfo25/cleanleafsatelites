# Handoff Manus → Jules — Tarea 2

## Base y rama

- Base obligatoria: `origin/main@1a943ff366bea2556efe4314f2731e514638007f`.
- Rama local: `feat/task2-supabase-auth-multitenant`.
- No se hizo merge, push ni despliegue.

## Integración controlada de Tarea 1

Se revisó el diff completo de `origin/feat/task1-persistencia-solicitudes-informes` y se integraron únicamente los componentes necesarios:

- `server/supabase-persistence.ts`
- `server/supabase-persistence.test.ts`
- integración de persistencia en `server/routers.ts`
- campos `source` y `dataSource` en `shared/report-catalog.ts`
- fallback sintético explícitamente etiquetado

No se integraron cambios de frontend, dependencias, Copernicus, despliegue ni arquitecturas antiguas de la rama de Tarea 1.

## Autenticación backend

- `server/supabase-auth.ts` valida el bearer token mediante `supabase.auth.getUser(token)` usando únicamente el cliente backend con clave anónima.
- El JWT se decodifica solo después de la validación remota.
- `sub` debe coincidir con el `id` del usuario validado.
- `tenant_id` debe existir en el JWT; si falta, la operación se rechaza.
- `user_id` y `tenant_id` se derivan del JWT validado, nunca del input del cliente.
- `SUPABASE_TENANT_ID` no es fuente de identidad en producción. En staging solo puede comprobar que coincide con el claim, nunca sustituirlo.
- Ausencia de bearer, token inválido, subject inconsistente o tenant ausente no produce fallback.

## Aislamiento multi-tenant

- `cleanleaf.createAnalysis` y `apiV1.solicitudes.create` requieren identidad Supabase válida.
- Las claves de idempotencia se scopean con `tenant_id`.
- `cleanleaf.reports.list` consulta únicamente informes con `.eq("tenant_id", identity.tenantId)`.
- `cleanleaf.reports.getById` consulta por `tenant_id` e `id` simultáneamente.
- Los informes demo no se mezclan con respuestas autenticadas de otros tenants.
- La persistencia asigna `solicitado_por` al `user_id` validado.

## Archivos nuevos o modificados

- `server/supabase-auth.ts`
- `server/supabase-auth.test.ts`
- `server/_core/context.ts`
- `server/supabase-persistence.ts`
- `server/supabase-persistence.test.ts`
- `server/routers.ts`
- `shared/report-catalog.ts`
- `docs/handoffs/MANUS_TO_JULES.md`

## Secretos

- `SUPABASE_SERVICE_ROLE_KEY` solo se lee en `server/supabase-persistence.ts`.
- No se usa en frontend, `VITE_*` ni código cliente.
- No se añadieron secretos, archivos `.env` ni credenciales reales.
- Antes de publicar se debe ejecutar un escaneo del diff y del bundle.

## Datos reales y sintéticos

- Los resultados sintéticos conservan la etiqueta `synthetic`.
- Esta tarea no agrega consultas nuevas a Copernicus CDSE.
- La persistencia Supabase usa la clave de servicio únicamente en backend.

## Validación pendiente antes de publicar

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

También debe verificarse el workflow CI, revisar el diff completo y detenerse antes de `git push` para solicitar aprobación explícita del propietario.
