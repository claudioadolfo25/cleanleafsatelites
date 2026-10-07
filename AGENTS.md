# AgroPulso — Reglas para agentes de código

## Producto
SaaS multi-tenant de monitoreo agrícola satelital (Sentinel-1/2) para
productores de maíz en LatAm. Interfaz en español LatAm. PRIORIDAD ACTUAL:
que funcione de punta a punta. El diseño visual es secundario.

## Arquitectura
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui → Vercel.
- Datos y auth: Supabase (PostgreSQL + PostGIS + Auth + RLS).
- Backend: Node.js + TypeScript (Express) en /server → Render (api + worker
  + cron). REST versionada /api/v1, validación con zod.
- Pagos: Stripe y Mercado Pago, SOLO en el backend.
- La lógica de dominio en /shared se conserva y se testea.

## Esquema
El esquema existente (tenants, users, planes, suscripciones, predios,
solicitudes_analisis, mediciones, informes, consumo_mensual, alertas,
api_keys, workflow_logs) se CONSERVA y se extiende. No renombrar tablas
existentes sin aprobación. Tablas nuevas siguen el mismo estilo.

## Reglas obligatorias
1. Toda tabla de negocio tiene tenant_id uuid NOT NULL, FK y RLS activado.
2. tenant_id y role se leen SOLO de app_metadata del JWT, nunca de
   user_metadata.
3. Consultas en nombre de un usuario: reenviar el JWT del usuario a Supabase
   (supabase-js con el token del usuario) para que RLS aplique. La
   service_role solo se usa en un módulo aislado (server/admin/) para
   workers, webhooks y tareas de plataforma, SIEMPRE con tenant_id explícito
   en cada consulta y registro en audit_log.
4. Cambios de base solo como migraciones versionadas en supabase/migrations/.
5. Ningún secreto en el código, en el frontend ni en git. Solo .env.example.
6. PROHIBIDO mantener o reintroducir: Manus OAuth, vite-plugin-manus-runtime,
   Forge, Drizzle, MySQL/TiDB y tRPC.
7. Webhooks de pago: verificar firma, idempotencia con eventos_pago.event_id
   UNIQUE, nunca confiar en parámetros del cliente.
8. Todo dato satelital lleva su origen: "real" (Copernicus) o "simulado".
   Nunca mostrar datos simulados como reales.
9. Alertas siempre con nivel de confianza y explicación; el agente no da
   dosis ni marcas y no diagnostica plagas de forma definitiva.
10. Todo PR incluye tests. No se hace merge con tests fallando.
11. Si algo es ambiguo o falta información, escribe la duda en el PR en vez
    de inventar.
12. Todo PR termina con la sección "NO VERIFICADO" listando lo que no pudiste
    ejecutar.

## Comandos
- pnpm install && pnpm check && pnpm test && pnpm build
