-- Automated Table Permissions, Auth Hook & RLS Assertion Suite (Migration 013)

BEGIN;

-- Diagnostic Header: Log environment roles, session user, and version
DO $$
DECLARE
  v_version TEXT;
  v_roles TEXT;
BEGIN
  SELECT version() INTO v_version;
  RAISE NOTICE 'DIAGNOSTIC: PostgreSQL Version: %', v_version;
  RAISE NOTICE 'DIAGNOSTIC: session_user=%, current_user=%', session_user, current_user;

  SELECT string_agg(rolname || ' (superuser=' || rolsuper || ', bypassrls=' || rolbypassrls || ')', ', ')
  INTO v_roles
  FROM pg_roles
  WHERE rolname IN ('postgres', 'authenticated', 'anon', 'service_role', 'supabase_auth_admin');

  RAISE NOTICE 'DIAGNOSTIC: Roles: %', v_roles;
END $$;

-- 1. Create temporary test tenants and users as privileged user
INSERT INTO public.tenants (id, nombre)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Tenant Test A'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Tenant Test B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, tenant_id, role, email)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'admin', 'admin-a@test.cl')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.predios (id, tenant_id, nombre, superficie_ha, geometria)
VALUES
  ('a1111111-1111-1111-1111-111111111111'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'Predio A', 50, '{"type":"Polygon","coordinates":[[[-72.6,-38.7],[-72.5,-38.7],[-72.5,-38.6],[-72.6,-38.6],[-72.6,-38.7]]]}'::jsonb),
  ('b2222222-2222-2222-2222-222222222222'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 'Predio B', 75, '{"type":"Polygon","coordinates":[[[-71.6,-37.7],[-71.5,-37.7],[-71.5,-37.6],[-71.6,-37.6],[-71.6,-37.7]]]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. Test Case 1: Validate Table and Function Privilege Matrix using has_table_privilege & has_function_privilege
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

  -- Check Function Execution privileges: custom_access_token_hook MUST BE REVOKED from authenticated and anon
  IF has_function_privilege('authenticated', 'public.custom_access_token_hook(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: authenticated role MUST NOT have EXECUTE on public.custom_access_token_hook';
  END IF;

  IF has_function_privilege('anon', 'public.custom_access_token_hook(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: anon role MUST NOT have EXECUTE on public.custom_access_token_hook';
  END IF;

  IF NOT has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: supabase_auth_admin must have EXECUTE on public.custom_access_token_hook';
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

  -- Check planes & suscripciones for authenticated: SELECT allowed, INSERT/UPDATE/DELETE denied
  IF NOT has_table_privilege('authenticated', 'public.planes', 'SELECT') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: authenticated role must have SELECT on public.planes';
  END IF;

  IF has_table_privilege('authenticated', 'public.planes', 'INSERT') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: authenticated role MUST NOT have INSERT privilege on public.planes';
  END IF;

  IF has_table_privilege('authenticated', 'public.suscripciones', 'INSERT') THEN
    RAISE EXCEPTION 'TEST FAILED [Case 1]: authenticated role MUST NOT have INSERT privilege on public.suscripciones';
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

  RAISE NOTICE 'ASSERTION PASSED: Test Case 1 (Strict DCL Table & Function Privilege Matrix successfully verified)';
END $$;

-- 3. Test Case 2: Validate Auth Hook Execution under supabase_auth_admin vs Block under authenticated
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.custom_access_token_hook('{"user_id": "11111111-1111-1111-1111-111111111111", "claims": {}}'::jsonb);
    RAISE EXCEPTION 'TEST FAILED [Case 2]: authenticated user direct call to custom_access_token_hook should have failed!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'ASSERTION PASSED: Test Case 2a (authenticated direct call to custom_access_token_hook correctly blocked with permission error)';
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        RAISE NOTICE 'ASSERTION PASSED: Test Case 2a (authenticated direct call to custom_access_token_hook correctly blocked with permission error)';
      ELSE
        RAISE EXCEPTION 'TEST FAILED [Case 2a]: Expected 42501 permission error, got %: %', SQLSTATE, SQLERRM;
      END IF;
  END;
END $$;

SET LOCAL ROLE supabase_auth_admin;

DO $$
DECLARE
  v_input_event JSONB;
  v_output_event JSONB;
BEGIN
  v_input_event := '{"user_id": "11111111-1111-1111-1111-111111111111", "claims": {}}'::jsonb;
  v_output_event := public.custom_access_token_hook(v_input_event);

  IF (v_output_event->'claims'->'app_metadata'->>'tenant_id') IS DISTINCT FROM 'a0000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'TEST FAILED [Case 2b]: custom_access_token_hook failed to inject tenant_id. Got: %', v_output_event;
  END IF;

  IF (v_output_event->'claims'->'app_metadata'->>'role') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'TEST FAILED [Case 2b]: custom_access_token_hook failed to inject role. Got: %', v_output_event;
  END IF;

  RAISE NOTICE 'ASSERTION PASSED: Test Case 2b (custom_access_token_hook executed successfully under supabase_auth_admin)';
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

-- 6. Test Case 5: Test Multi-Tenant Isolation under authenticated role
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_count_a INT;
  v_count_b INT;
BEGIN
  -- Set Tenant A JWT Claims
  PERFORM set_config('request.jwt.claims', '{"app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}}', true);

  SELECT count(*) INTO v_count_a FROM public.predios WHERE id = 'a1111111-1111-1111-1111-111111111111'::uuid;
  SELECT count(*) INTO v_count_b FROM public.predios WHERE id = 'b2222222-2222-2222-2222-222222222222'::uuid;

  IF v_count_a <> 1 OR v_count_b <> 0 THEN
    RAISE EXCEPTION 'TEST FAILED [Case 5]: Tenant A should see predio A (1) and NOT predio B (0). Got A=%, B=%', v_count_a, v_count_b;
  END IF;

  RAISE NOTICE 'ASSERTION PASSED: Test Case 5 (Multi-tenant isolation verified under authenticated role)';
END $$;

ROLLBACK;
