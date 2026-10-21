BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(2);

-- 1. Grant permissions to authenticated role for test scope
GRANT INSERT, SELECT ON public.tenants, public.audit_logs TO authenticated;

-- 2. Insert test tenant (as privileged user)
INSERT INTO public.tenants (id, nombre)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Tenant Test Insert')
ON CONFLICT (id) DO NOTHING;

-- Switch to authenticated role so PostgreSQL enforces RLS policies
SET LOCAL ROLE authenticated;

-------------------------------------------------------------------------------
-- Caso 1: Usuario autenticado con auth.uid() presente puede insertar audit_log
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}}', true);

SELECT lives_ok(
  $$ INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity)
     VALUES ('33333333-3333-3333-3333-333333333333'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'user-insert', 'action_insert', 'tenant') $$,
  'Caso 1: Usuario autenticado con auth.uid() puede insertar audit_log'
);

-------------------------------------------------------------------------------
-- Caso 2: Usuario sin auth.uid() NO puede insertar audit_log
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{}', true);

SELECT throws_ok(
  $$ INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity)
     VALUES ('44444444-4444-4444-4444-444444444444'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'user-anon', 'action_anon', 'tenant') $$,
  NULL,
  'Caso 2: Usuario sin auth.uid() NO puede insertar audit_log'
);

SELECT * FROM finish();

ROLLBACK;
