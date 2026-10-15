# Handoff Manus → Jules — Tarea 3

## Base y rama

La rama es `feat/task3-copernicus-cdse-staging` y parte de la referencia `origin/main` disponible al iniciar la tarea: `1a943ff366bea2556efe4314f2731e514638007f`. El commit `52f4b685d8de670199b901126cafdfd0c62a87fc` indicado en el prompt no existe en el remoto actual. No se contactó CDSE real desde el sandbox.

## Archivos modificados

Se modificaron `server/copernicus.ts`, `server/copernicus.test.ts`, `server/routers.ts`, `shared/satellite-service.ts`, `shared/data-traceability.ts`, `shared/observation-provider.ts`, `docs/RENDER_ENV.md` y `.github/workflows/ci.yml`. Se añadió el workflow CI histórico disponible en el repositorio porque `origin/main` no lo contenía.

## Decisiones de activación

Copernicus real se activa únicamente cuando `COPERNICUS_MODE=live`, el entorno está autorizado como staging mediante `APP_ENV=staging` o `RENDER_ENV=staging`, y `COPERNICUS_CLIENT_ID` y `COPERNICUS_CLIENT_SECRET` están configurados. Producción no habilita el proveedor real. Fuera de esas condiciones se usa el proveedor sintético determinista.

## Errores y fallback

Los errores de OAuth, red, timeout, rate limit, HTTP y las respuestas CDSE sin un promedio numérico válido no se convierten en datos inventados. El wrapper de observación degrada a un valor sintético determinista derivado de `predioId`, satélite y variable, con `data_source: "synthetic"`, `status: "fallback"` y la causa del error en la trazabilidad.

## Trazabilidad

Cada medición contiene `provider`, `queried_at`, `satellite`, `product`, `status` y `data_source`. Las respuestas reales se etiquetan `copernicus_cdse`; las sintéticas, `synthetic`. El informe copia la trazabilidad de la medición y conserva la etiqueta en `fuentes` y `mediciones`.

## Seguridad

Las credenciales solo se leen en backend. No se copiaron valores reales al repositorio, frontend, bundle, variables `VITE_*`, logs o capturas. Las variables de staging se documentan únicamente por nombre y con placeholders no reales. No se modificó producción ni el esquema Supabase.

## Validación de Jules

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

El workflow `.github/workflows/ci.yml` ejecuta instalación reproducible, TypeScript, tests, build y escaneo de secretos del diff. Jules debe verificar que el PR se ejecuta contra `main`, que CI pasa y que no existen secretos en los cambios.

## Pendientes y límites

La integración real debe validarse en Render staging con las variables configuradas por el propietario. El sandbox no contacta CDSE real. No se implementó aprobación de Tier 3, no se hizo despliegue y no se modificó el esquema de Supabase. La referencia base indicada en el prompt requiere reconciliación porque no existe en el remoto actual.
