-- pgTAP Test Suite for Audit Logs Security & RLS Isolation
-- Executed via `supabase test db` using pgTAP assertion framework

BEGIN;

SELECT plan(4);

-- Setup Temporary Test Environment Data
INSERT INTO public.tenants (id, nombre)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Tenant Test A'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Tenant Test B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, tenant_id, role, email)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'admin', 'admin-a@test.cl'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 'admin', 'admin-b@test.cl')
ON CONFLICT (id) DO NOTHING;

-- Test 1: Ordinary authenticated user CANNOT insert into audit_logs (DCL REVOKE denial)
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$ INSERT INTO public.audit_logs (id, tenant_id, action, entity) VALUES ('99999999-9999-9999-9999-999999999999'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'unauthorized_test', 'audit') $$,
  '42501',
  NULL,
  'Test 1: Ordinary authenticated client direct INSERT in audit_logs is blocked by DCL REVOKE (SQLSTATE 42501)'
);

-- Test 2: Authorized writer (service_role) CAN insert into audit_logs and record is stored
SET LOCAL ROLE service_role;

INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity, payload)
VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, '11111111-1111-1111-1111-111111111111', 'admin.update_plan', 'tenant', '{"actor_type": "user"}'::jsonb),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, '22222222-2222-2222-2222-222222222222', 'admin.update_plan', 'tenant', '{"actor_type": "user"}'::jsonb);

SELECT results_eq(
  $$ SELECT count(*)::integer FROM public.audit_logs WHERE id IN ('10000000-0000-0000-0000-000000000001'::uuid, '20000000-0000-0000-0000-000000000002'::uuid) $$,
  ARRAY[2],
  'Test 2: Authorized service_role writer successfully inserts audit records'
);

-- Test 3: Tenant A CANNOT read audit logs belonging to Tenant B (RLS isolation)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}}', true);

SELECT results_eq(
  $$ SELECT count(*)::integer FROM public.audit_logs WHERE id = '20000000-0000-0000-0000-000000000002'::uuid $$,
  ARRAY[0],
  'Test 3: Tenant A authenticated admin cannot read audit log records belonging to Tenant B'
);

-- Test 4: Authorized profile in Tenant A CAN read its own audit log records
SELECT results_eq(
  $$ SELECT count(*)::integer FROM public.audit_logs WHERE id = '10000000-0000-0000-0000-000000000001'::uuid $$,
  ARRAY[1],
  'Test 4: Authorized Tenant A admin can read its own tenant audit log records'
);

SELECT * FROM finish();
ROLLBACK;
