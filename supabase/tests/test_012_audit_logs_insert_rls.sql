-- Automated RLS Insert Integrity Test for audit_logs (Migration 012)

BEGIN;

-- 1. Create temporary test tenant as privileged user
INSERT INTO public.tenants (id, nombre)
VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, 'Tenant Test A')
ON CONFLICT (id) DO NOTHING;

-- 2. Test Case 1: Direct INSERT as authenticated user MUST fail with RLS violation (42501)
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}}', true);

  BEGIN
    INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity)
    VALUES ('33333333-3333-3333-3333-333333333333'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'user-a', 'unauthorized_insert', 'tenant');

    RAISE EXCEPTION 'TEST FAILED [Case 1]: Authenticated user direct INSERT should have been blocked by RLS!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERTION PASSED: Test Case 1 (Direct authenticated user INSERT blocked by RLS violation 42501)';
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        RAISE NOTICE 'ASSERTION PASSED: Test Case 1 (Direct authenticated user INSERT blocked by RLS violation 42501)';
      ELSE
        RAISE EXCEPTION 'TEST FAILED [Case 1]: Expected RLS violation 42501 but got error (SQLSTATE %): %', SQLSTATE, SQLERRM;
      END IF;
  END;
END $$;

-- 3. Test Case 2: Anti-spoofing - Even super_admin JWT claims cannot execute direct client INSERT
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"app_metadata": {"role": "super_admin"}}', true);

  BEGIN
    INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity)
    VALUES ('55555555-5555-5555-5555-555555555555'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'fake-actor', 'spoofed_insert', 'tenant');

    RAISE EXCEPTION 'TEST FAILED [Case 2]: Super admin client JWT direct INSERT should have been blocked by RLS!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERTION PASSED: Test Case 2 (Super admin client JWT direct INSERT blocked by RLS violation 42501)';
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        RAISE NOTICE 'ASSERTION PASSED: Test Case 2 (Super admin client JWT direct INSERT blocked by RLS violation 42501)';
      ELSE
        RAISE EXCEPTION 'TEST FAILED [Case 2]: Expected RLS violation 42501 but got error (SQLSTATE %): %', SQLSTATE, SQLERRM;
      END IF;
  END;
END $$;

-- 4. Test Case 3: Direct SQL INSERT under service_role MUST succeed
SET LOCAL ROLE service_role;

DO $$
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION 'TEST FAILED [Case 3]: Expected current_user to be service_role, but got %', current_user;
  END IF;

  INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity, payload)
  VALUES ('44444444-4444-4444-4444-444444444444'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'service-writer', 'authorized_backend_insert', 'tenant', '{"actor_type": "system"}'::jsonb);

  IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '44444444-4444-4444-4444-444444444444'::uuid) THEN
    RAISE EXCEPTION 'TEST FAILED [Case 3]: service_role failed to insert or query inserted audit record!';
  END IF;

  RAISE NOTICE 'ASSERTION PASSED: Test Case 3 (Direct SQL INSERT and SELECT under service_role succeeded)';
END $$;

ROLLBACK;
