-- Reproducible verification script for Migration 011 RLS Policies on audit_logs
-- NOTE: Local Postgres/Supabase container is currently unavailable in this environment.
-- STATUS: MARKED AS PENDING BLOCK FOR REMOTE MIGRATION APPLICATION.

BEGIN;

-- 1. Create temporary test tenants if needed
INSERT INTO public.tenants (id, nombre, plan)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Tenant A', 'pro'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Tenant B', 'pro')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert test audit log records as superuser/postgres
INSERT INTO public.audit_logs (id, tenant_id, user_id, action, entity)
VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'user-a', 'test_action_a', 'tenant'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 'user-b', 'test_action_b', 'tenant')
ON CONFLICT (id) DO NOTHING;

-- Switch to non-superuser authenticated role so PostgreSQL enforces RLS policies
SET LOCAL ROLE authenticated;

-- 3. Test Case 1: Admin A JWT claims -> sees only Tenant A log, NOT Tenant B
SET LOCAL request.jwt.claims = '{"app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "admin"}}';
-- Expected result: Exactly 1 row ('11111111-1111-1111-1111-111111111111')
SELECT id, tenant_id, action FROM public.audit_logs;

-- 4. Test Case 2: Owner B JWT claims -> sees only Tenant B log, NOT Tenant A
SET LOCAL request.jwt.claims = '{"app_metadata": {"tenant_id": "b0000000-0000-0000-0000-000000000002", "role": "owner"}}';
-- Expected result: Exactly 1 row ('22222222-2222-2222-2222-222222222222')
SELECT id, tenant_id, action FROM public.audit_logs;

-- 5. Test Case 3: Super Admin JWT claims -> sees all rows (both Tenant A and Tenant B)
SET LOCAL request.jwt.claims = '{"app_metadata": {"role": "super_admin"}}';
-- Expected result: Exactly 2 rows
SELECT id, tenant_id, action FROM public.audit_logs;

-- 6. Test Case 4: Normal User JWT claims -> sees 0 rows (no admin privileges granted)
SET LOCAL request.jwt.claims = '{"app_metadata": {"tenant_id": "a0000000-0000-0000-0000-000000000001", "role": "user"}}';
-- Expected result: Exactly 0 rows
SELECT id, tenant_id, action FROM public.audit_logs;

ROLLBACK;
