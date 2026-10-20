-- Automated Table Permissions, Auth Hook & RLS Assertion Suite (Migration 013)

BEGIN;

-- 1. Create temporary test tenants and users as privileged user
INSERT INTO public.tenants (id, nombre)
VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, 'Tenant Test A')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, tenant_id, role, email)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'admin', 'admin-a@test.cl')
ON CONFLICT (id) DO NOTHING;

-- 2. Test Case 1: Validate Table Privilege Matrix using has_table_privilege
DO $$
BEGIN
  -- Check Schema USAGE
  IF NOT has_schema_privilege('authenticated', 'public', 'USAGE') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: authenticated role must have USAGE on schema public';
  END IF;

  IF NOT has_schema_privilege('service_role', 'public', 'USAGE') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: service_role must have USAGE on schema public';
  END IF;

  IF NOT has_schema_privilege('supabase_auth_admin', 'public', 'USAGE') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: supabase_auth_admin must have USAGE on schema public';
  END IF;

  -- Check authenticated privileges on business tables
  IF NOT has_table_privilege('authenticated', 'public.predios', 'SELECT') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: authenticated role must have SELECT on public.predios';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.predios', 'INSERT') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: authenticated role must have INSERT on public.predios';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.solicitudes_analisis', 'SELECT') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: authenticated role must have SELECT on public.solicitudes_analisis';
  END IF;

  -- Check audit_logs permissions for authenticated: SELECT allowed, INSERT denied
  IF NOT has_table_privilege('authenticated', 'public.audit_logs', 'SELECT') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: authenticated role must have SELECT on public.audit_logs';
  END IF;

  IF has_table_privilege('authenticated', 'public.audit_logs', 'INSERT') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: authenticated role MUST NOT have INSERT privilege on public.audit_logs';
  END IF;

  -- Check anon role: Zero table privileges
  IF has_table_privilege('anon', 'public.predios', 'SELECT') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: anon role MUST NOT have SELECT privilege on public.predios';
  END IF;

  -- Check supabase_auth_admin role: SELECT on users
  IF NOT has_table_privilege('supabase_auth_admin', 'public.users', 'SELECT') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: supabase_auth_admin must have SELECT privilege on public.users';
  END IF;

  RAISE NOTICE 'ASSERTION PASSED: Test Case 1 (Minimum DCL Table Privilege Matrix successfully verified)';
END $$;

-- 3. Test Case 2: Validate Custom Access Token Hook under supabase_auth_admin role
SET LOCAL ROLE supabase_auth_admin;

DO $$
DECLARE
  v_input_event JSONB;
  v_output_event JSONB;
BEGIN
  v_input_event := '{"user_id": "11111111-1111-1111-1111-111111111111", "claims": {}}'::jsonb;
  v_output_event := public.custom_access_token_hook(v_input_event);

  IF (v_output_event->'claims'->'app_metadata'->>'tenant_id') <> 'a0000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'TEST FAILED [Case 2]: custom_access_token_hook failed to inject tenant_id. Got: %', v_output_event;
  END IF;

  IF (v_output_event->'claims'->'app_metadata'->>'role') <> 'admin' THEN
    RAISE EXCEPTION 'TEST FAILED [Case 2]: custom_access_token_hook failed to inject role. Got: %', v_output_event;
  END IF;

  RAISE NOTICE 'ASSERTION PASSED: Test Case 2 (custom_access_token_hook executed successfully under supabase_auth_admin)';
END $$;

-- 4. Test Case 3: Test authenticated direct INSERT in audit_logs is blocked by DCL/RLS
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}}', true);

  BEGIN
    INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity)
    VALUES ('77777777-7777-7777-7777-777777777777'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'user-a', 'unauthorized_insert', 'tenant');

    RAISE EXCEPTION 'TEST FAILED [Case 3]: Authenticated user direct INSERT in audit_logs should have failed!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERTION PASSED: Test Case 3 (Direct INSERT in audit_logs correctly blocked for authenticated role)';
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        RAISE NOTICE 'ASSERTION PASSED: Test Case 3 (Direct INSERT in audit_logs correctly blocked for authenticated role)';
      ELSE
        RAISE EXCEPTION 'TEST FAILED [Case 3]: Unexpected error (SQLSTATE %): %', SQLSTATE, SQLERRM;
      END IF;
  END;
END $$;

-- 5. Test Case 4: Test service_role can insert into audit_logs and business tables
SET LOCAL ROLE service_role;

DO $$
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION 'TEST FAILED [Case 4]: Expected current_user to be service_role, got %', current_user;
  END IF;

  INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity, payload)
  VALUES ('88888888-8888-8888-8888-888888888888'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'service-writer', 'authorized_insert', 'tenant', '{"actor_type": "system"}'::jsonb);

  IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '88888888-8888-8888-8888-888888888888'::uuid) THEN
    RAISE EXCEPTION 'TEST FAILED [Case 4]: service_role failed to insert or query audit record!';
  END IF;

  RAISE NOTICE 'ASSERTION PASSED: Test Case 4 (service_role successfully inserted into audit_logs)';
END $$;

ROLLBACK;
