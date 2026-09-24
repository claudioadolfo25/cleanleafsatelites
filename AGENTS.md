# AgroPulso — Reglas para agentes de código

## Producto
SaaS multi-tenant de monitoreo agrícola satelital (Sentinel-1/2) para
productores de maíz en LatAm. Interfaz en español LatAm.

## Arquitectura
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui → Vercel.
- Datos y auth: Supabase (PostgreSQL + PostGIS + Auth + RLS).
- Backend: FastAPI (Python) en /backend → Render (api + worker + cron).
- Pagos: Stripe y Mercado Pago, SOLO en el backend.

## Reglas obligatorias
1. Toda tabla de negocio tiene tenant_id uuid NOT NULL y RLS activado.
2. tenant_id y role se leen SOLO de app_metadata del JWT, nunca de
   user_metadata.
3. El backend NO se conecta con el rol postgres ni service_role para consultas
   de usuario (saltan RLS). Usa un rol de aplicación sin BYPASSRLS y
   SET LOCAL app.current_tenant por transacción, o reenvía el JWT del usuario.
4. Cambios de base solo como migraciones versionadas en supabase/migrations/.
5. Ningún secreto en el código, en el frontend ni en git. Solo .env.example.
6. PROHIBIDO reintroducir: Manus OAuth, Drizzle, MySQL/TiDB, tRPC, Forge,
   vite-plugin-manus-runtime.
7. Webhooks de pago: verificar firma, idempotencia con eventos_pago.event_id
   UNIQUE, nunca confiar en parámetros del cliente.
8. Alertas siempre con nivel de confianza y explicación; el agente no da
   dosis ni marcas y no diagnostica plagas de forma definitiva.
9. Todo PR incluye tests. No se hace merge con tests fallando.
10. Si algo es ambiguo o falta información, escribe la duda en el PR en vez de
    inventar.

## Comandos
- Frontend: npm install && npm run build && npm test
- Backend: cd backend && pip install -r requirements.txt && pytest
