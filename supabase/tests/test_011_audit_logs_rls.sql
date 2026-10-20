-- Automated RLS Isolation Test for audit_logs (Migration 011)

BEGIN;

-- 1. Grant SELECT permission to authenticated role
GRANT SELECT ON public.tenants, public.audit_logs TO authenticated;

-- 2. Create temporary test tenants as privileged user
INSERT INTO public.tenants (id, nombre)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Tenant Test A'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Tenant Test B')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert test audit log records as privileged user
INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'user-a', 'test_action_a', 'tenant'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 'user-b', 'test_action_b', 'tenant')
ON CONFLICT (id) DO NOTHING;

-- Switch to non-superuser authenticated role so PostgreSQL enforces RLS policies
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_has_a BOOLEAN;
  v_has_b BOOLEAN;
BEGIN
  -----------------------------------------------------------------------------
  -- Test Case 1: Admin A JWT claims -> sees test record A, but NOT test record B
  -----------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '{"app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}}', true);

  SELECT
    EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '11111111-1111-1111-1111-111111111111'::uuid),
    EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '22222222-2222-2222-2222-222222222222'::uuid)
  INTO v_has_a, v_has_b;

  IF NOT v_has_a THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: Admin A should be able to see record A (11111111-1111-1111-1111-111111111111)';
  END IF;

  IF v_has_b THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: Admin A must NOT see record B (22222222-2222-2222-2222-222222222222)';
  END IF;

  RAISE NOTICE 'ASSERTION PASSED: Test Case 1 (Admin A sees record A, not record B)';

  -----------------------------------------------------------------------------
  -- Test Case 2: Owner B JWT claims -> sees test record B, but NOT test record A
  -----------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '{"app_metadata": {"tenant_id": "b0000000-0000-0000-0000-000000000002", "role": "owner"}}', true);

  SELECT
    EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '11111111-1111-1111-1111-111111111111'::uuid),
    EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '22222222-2222-2222-2222-222222222222'::uuid)
  INTO v_has_a, v_has_b;

  IF v_has_a THEN
    RAISE EXCEPTION 'TEST FAILED [Case 2]: Owner B must NOT see record A (11111111-1111-1111-1111-111111111111)';
  END IF;

  IF NOT v_has_b THEN
    RAISE EXCEPTION 'TEST FAILED [Case 2]: Owner B should be able to see record B (22222222-2222-2222-2222-222222222222)';
  END IF;

  RAISE NOTICE 'ASSERTION PASSED: Test Case 2 (Owner B sees record B, not record A)';

  -----------------------------------------------------------------------------
  -- Test Case 3: Super Admin JWT claims -> sees BOTH test record A and test record B
  -----------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '{"app_metadata": {"role": "super_admin"}}', true);

  SELECT
    EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '11111111-1111-1111-1111-111111111111'::uuid),
    EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '22222222-2222-2222-2222-222222222222'::uuid)
  INTO v_has_a, v_has_b;

  IF NOT (v_has_a AND v_has_b) THEN
    RAISE EXCEPTION 'TEST FAILED [Case 3]: Super Admin should be able to see both record A and record B';
  END IF;

  RAISE NOTICE 'ASSERTION PASSED: Test Case 3 (Super Admin sees both record A and record B)';

  -----------------------------------------------------------------------------
  -- Test Case 4: Normal User JWT claims -> sees NEITHER test record A NOR test record B
  -----------------------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '{"app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "user"}}', true);

  SELECT
    EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '11111111-1111-1111-1111-111111111111'::uuid),
    EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '22222222-2222-2222-2222-222222222222'::uuid)
  INTO v_has_a, v_has_b;

  IF v_has_a OR v_has_b THEN
    RAISE EXCEPTION 'TEST FAILED [Case 4]: Normal User must NOT see any administrative audit records';
  END IF;

  RAISE NOTICE 'ASSERTION PASSED: Test Case 4 (Normal User sees 0 test audit records)';

END $$;

ROLLBACK;
