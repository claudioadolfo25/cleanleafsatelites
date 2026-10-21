BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(6);

-- 1. Grant SELECT permissions to authenticated role for test scope
GRANT SELECT ON public.tenants, public.audit_logs TO authenticated;

-- 2. Insert test tenants (as privileged user)
INSERT INTO public.tenants (id, nombre)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Tenant Test A'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Tenant Test B')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert test audit log records (as privileged user)
INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'user-a', 'test_action_a', 'tenant'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 'user-b', 'test_action_b', 'tenant')
ON CONFLICT (id) DO NOTHING;

-- Switch to authenticated role so PostgreSQL enforces RLS policies
SET LOCAL ROLE authenticated;

-------------------------------------------------------------------------------
-- Caso 1: Admin A JWT claims -> ve el registro A, NO ve el registro B
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.audit_logs WHERE id = '11111111-1111-1111-1111-111111111111'::uuid),
  1,
  'Caso 1: Admin A ve el registro A'
);

SELECT is(
  (SELECT count(*)::int FROM public.audit_logs WHERE id = '22222222-2222-2222-2222-222222222222'::uuid),
  0,
  'Caso 1: Admin A NO ve el registro B'
);

-------------------------------------------------------------------------------
-- Caso 2: Owner B JWT claims -> ve el registro B, NO ve el registro A
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"app_metadata": {"tenant_id": "b0000000-0000-0000-0000-000000000002", "role": "owner"}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.audit_logs WHERE id = '11111111-1111-1111-1111-111111111111'::uuid),
  0,
  'Caso 2: Owner B NO ve el registro A'
);

SELECT is(
  (SELECT count(*)::int FROM public.audit_logs WHERE id = '22222222-2222-2222-2222-222222222222'::uuid),
  1,
  'Caso 2: Owner B ve el registro B'
);

-------------------------------------------------------------------------------
-- Caso 3: Super Admin JWT claims -> ve ambos registros A y B
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"app_metadata": {"role": "super_admin"}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.audit_logs WHERE id IN ('11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid)),
  2,
  'Caso 3: Super Admin ve ambos registros A y B'
);

-------------------------------------------------------------------------------
-- Caso 4: Usuario normal JWT claims -> ve 0 registros administrativos
-------------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "user"}}', true);

SELECT is(
  (SELECT count(*)::int FROM public.audit_logs WHERE id IN ('11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid)),
  0,
  'Caso 4: Usuario normal ve 0 registros administrativos'
);

SELECT * FROM finish();

ROLLBACK;
