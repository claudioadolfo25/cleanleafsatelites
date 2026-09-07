# Cleanleaf MVP — Instrucciones para Jules

## Contexto

Cleanleaf es un SaaS de monitoreo satelital para agricultura. El MVP está enfocado en:
- Vertical agricultura (La Araucanía).
- Dos ejes: tamaño del área (tier) y fuente de datos (satélite).
- Stubs de Copernicus CDSE (integración real en Fase 2).

## Stack

- Next.js 14 / Vite + React + TypeScript + Tailwind CSS + shadcn/ui.
- tRPC para API (versionado como `apiV1`).
- MySQL con Drizzle (demo) → Supabase/Postgres con RLS (objetivo).
- Dify para agentes IA.
- n8n para workflows (stubs).

## Setup

Ejecutar `./setup.sh` para configurar el entorno.

## Tareas Prioritarias

1. **Corregir flujos incompletos**: Ver `docs/DIAGNOSTICO_FLUJOS.md`.
2. **Completar integración de informes**: Ver `docs/reports-dashboard-guide.md`.
3. **Preparar migración a Supabase**: Ver `supabase/schema.sql`.
4. **Agregar tests E2E**: Ver `server/satellite-domain.test.ts` y directorio `tests/`.
5. **Optimizar configuración de satélites**: Ver `shared/satellite-catalog.ts`.

## Reglas

- No modificar `shared/satellite-catalog.ts` sin validación de producto.
- Sentinel-4/5P/6 están fuera de alcance — no agregar al catálogo.
- Mantener contratos de API estables (no romper clientes existentes).
- Todos los cambios deben pasar tests (`pnpm test`) y typecheck (`pnpm check`).
