# Handoff Manus → Jules — Tarea 1

## Estado

Implementación local en la rama `feat/task1-persistencia-solicitudes-informes`, basada en el checkout `8811f6a`. No se publicó, no se abrió PR y no se modificaron credenciales ni Render.

Los archivos de baseline solicitados (`docs/architecture/CURRENT_STATE.md`, `docs/reports/baseline/*` y `docs/handoffs/JULES_TO_OWNER.md`) no existen en las referencias locales. Se usó `AGENTS.md` disponible y la arquitectura efectiva del checkout.

## Archivos modificados

- `server/supabase-persistence.ts`: adaptador backend para insertar en `solicitudes_analisis`, insertar en `informes`, enlazar `resultado_informe_id` y leer informes filtrados por `tenant_id`. Solo usa `SUPABASE_SERVICE_ROLE_KEY` dentro de `server/`.
- `server/routers.ts`: conecta `createAnalysisRequest`, `cleanleaf.reports.list` y `cleanleaf.reports.getById` al adaptador cuando existe una identidad segura y Supabase está configurado. Conserva las semillas demo como fallback.
- `server/supabase-persistence.test.ts`: prueba aislada de creación, enlace, listado y aislamiento por tenant con cliente Supabase mock.
- `shared/report-catalog.ts`: añade `source` y `dataSource`; las semillas se marcan como `demo` y `synthetic`.
- `shared/satellite-service.ts` y `src/lib/copernicus.ts`: añaden `data_source` (`synthetic` o `copernicus_cdse`) a las mediciones.
- `tests/copernicus-integration.test.ts`: verifica que el fallback sin credenciales queda etiquetado como `synthetic`.
- `client/src/pages/ReportsDashboard.tsx`: muestra `Demo`/`Mi solicitud` y la procedencia sintética.
- `client/src/pages/ReportDetail.tsx`: muestra procedencia y fuente en la ficha del informe.

## Decisiones

1. **Sin cambio de esquema.** Se usan las columnas existentes de `supabase/schema.sql`: `tenant_id`, `solicitudes_analisis`, `informes`, `contenido` y `resultado_informe_id`.
2. **Filtro obligatorio de persistencia.** La persistencia solo se habilita cuando existe usuario autenticado y `SUPABASE_TENANT_ID`. Si no se puede determinar el tenant, no se ejecuta ninguna consulta amplia y se mantiene el flujo sintético local.
3. **Identidad actual.** Este checkout todavía usa Manus OAuth y no implementa autenticación Supabase backend completa; por eso la resolución definitiva de usuario/tenant queda explícitamente fuera de esta tarea. Jules debe integrar el `tenant_id` de la sesión en la siguiente tarea.
4. **Idempotencia.** Se consulta primero `solicitudes_analisis` por `tenant_id + idempotency_key`; cuando ya existe enlace, se devuelve el informe persistido.
5. **Demo separada.** Las semillas demo siguen visibles para la experiencia inicial, pero se identifican con `source: "demo"`; los informes persistidos usan `source: "user"`.
6. **Fallback sintético.** Cuando no hay credenciales CDSE, el resultado se etiqueta `data_source: "synthetic"` y la trazabilidad lo explica. No se presentan esos valores como observaciones satelitales reales.

## Datos reales vs. sintéticos

- **Sintéticos:** valores producidos por `CopernicusProvider` cuando no hay credenciales; todos llevan `data_source: "synthetic"`.
- **CDSE real:** el proveedor existente conserva su camino CDSE si el entorno ya lo habilita; esta tarea no agrega ni modifica credenciales ni implementa nuevas consultas CDSE.
- **Persistencia real:** el adaptador usa Supabase Postgres mediante `@supabase/supabase-js` solo en backend y con `SUPABASE_SERVICE_ROLE_KEY`.

## Riesgos y pendientes

- `SUPABASE_TENANT_ID` es actualmente una configuración de transición, no una resolución multi-tenant definitiva. Debe reemplazarse por el tenant derivado de claims Supabase en la siguiente tarea.
- El `predio_id` de la UI puede no ser UUID de Supabase; por seguridad se guarda `null` hasta resolver el mapeo de predios, sin inventar una FK.
- `solicitado_por` queda `null` mientras Manus `openId` no sea un UUID de `auth.users`/`public.users`.
- No se verificó contra una base de producción y no se debe hacer desde esta rama sin un entorno Supabase de staging autorizado.

## Validación exacta para Jules

Desde la raíz del repositorio:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

Pruebas focalizadas:

```bash
pnpm exec vitest run server/supabase-persistence.test.ts tests/copernicus-integration.test.ts
```

Para validar con un Supabase de staging, configurar únicamente en el backend:

```text
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-en-el-panel-del-servidor>
SUPABASE_TENANT_ID=<uuid-del-tenant-de-staging>
```

Después de iniciar la app con un usuario autenticado, crear una solicitud desde el formulario y comprobar:

1. Existe una fila en `solicitudes_analisis` para el tenant configurado.
2. Existe una fila enlazada en `informes` mediante `solicitud_id` y `resultado_informe_id`.
3. `/dashboard/informes` muestra el informe con etiqueta `Mi solicitud`.
4. El detalle muestra trazabilidad y los botones de exportación.
5. Sin credenciales CDSE, el informe muestra `synthetic` y no afirma que sea una escena real.

Nunca copiar `SUPABASE_SERVICE_ROLE_KEY` al frontend, a `VITE_*`, al bundle, a capturas o a logs.
