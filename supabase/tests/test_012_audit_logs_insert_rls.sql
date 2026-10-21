BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(4);

-- Setup: insert test tenant as privileged user (before switching role)
INSERT INTO public.tenants (id, nombre)
VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, 'Tenant Test Insert')
ON CONFLICT (id) DO NOTHING;

-- Caso 1: authenticated NO puede insertar directamente (migración 012 revoca INSERT)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}}', true);

SELECT throws_ok(
  $$ INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity)
     VALUES ('33333333-3333-3333-3333-333333333333'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'user-insert', 'action_insert', 'tenant') $$,
  '42501',
  NULL,
  'Caso 1: authenticated NO puede insertar en audit_logs (42501)'
);

-- Caso 2: super_admin JWT tampoco puede insertar directamente
SELECT set_config('request.jwt.claims', '{"sub": "55555555-5555-5555-5555-555555555555", "app_metadata": {"role": "super_admin"}}', true);

SELECT throws_ok(
  $$ INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity)
     VALUES ('55555555-5555-5555-5555-555555555555'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'fake-actor', 'spoofed_insert', 'tenant') $$,
  '42501',
  NULL,
  'Caso 2: super_admin JWT NO puede insertar en audit_logs (42501)'
);

-- Caso 3: service_role SÍ puede insertar (escritor backend autorizado)
SET LOCAL ROLE service_role;

SELECT lives_ok(
  $$ INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity, payload)
     VALUES ('44444444-4444-4444-4444-444444444444'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'service-writer', 'authorized_backend_insert', 'tenant', '{"actor_type": "system"}'::jsonb) $$,
  'Caso 3: service_role puede insertar en audit_logs'
);

SELECT is(
  (SELECT count(*)::int FROM public.audit_logs WHERE id = '44444444-4444-4444-4444-444444444444'::uuid),
  1,
  'Caso 3: el registro insertado por service_role existe'
);

SELECT * FROM finish();

ROLLBACK;
