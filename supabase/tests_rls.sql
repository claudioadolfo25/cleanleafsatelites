-- Supabase Multi-Tenant RLS Test Suite for PostGIS / Postgres
\set ON_ERROR_STOP on

BEGIN;

-- Setup test tenants
INSERT INTO tenants (id, nombre, vertical)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tenant A - Fundo Araucania', 'agricultura'),
  ('22222222-2222-2222-2222-222222222222', 'Tenant B - Salmonera Sur', 'acuicultura')
ON CONFLICT (id) DO NOTHING;

-- Setup test users
INSERT INTO users (id, tenant_id, role, email)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'owner', 'owner@tenant-a.cl'),
  ('v1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'viewer', 'viewer@tenant-a.cl'),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'agricultor', 'user@tenant-b.cl')
ON CONFLICT (id) DO NOTHING;

-- Setup test predios
INSERT INTO predios (id, tenant_id, nombre, superficie_ha)
VALUES
  ('p1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Predio Las Quinas (A)', 42.0),
  ('p2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Predio Canal Chacao (B)', 120.0)
ON CONFLICT (id) DO NOTHING;

-- Test 1: Verify Tenant A reads only Tenant A predios
SET LOCAL request.jwt.claims = '{"app_metadata": {"tenant_id": "11111111-1111-1111-1111-111111111111", "role": "owner"}}';
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  predio_count integer;
BEGIN
  SELECT count(*) INTO predio_count FROM predios;
  IF predio_count != 1 THEN
    RAISE EXCEPTION 'RLS FAIL: Tenant A should see exactly 1 predio, saw %', predio_count;
  END IF;
END $$;

-- Test 2: Verify Tenant B reads only Tenant B predios
SET LOCAL request.jwt.claims = '{"app_metadata": {"tenant_id": "22222222-2222-2222-2222-222222222222", "role": "agricultor"}}';

DO $$
DECLARE
  predio_count integer;
BEGIN
  SELECT count(*) INTO predio_count FROM predios;
  IF predio_count != 1 THEN
    RAISE EXCEPTION 'RLS FAIL: Tenant B should see exactly 1 predio, saw %', predio_count;
  END IF;
END $$;

-- Test 3: Privilege Escalation Guard Test - Viewer attempting to elevate role to owner/admin
SET LOCAL request.jwt.claims = '{"app_metadata": {"tenant_id": "11111111-1111-1111-1111-111111111111", "role": "viewer"}}';

DO $$
DECLARE
  updated_rows integer;
BEGIN
  UPDATE users SET role = 'owner' WHERE id = 'v1111111-1111-1111-1111-111111111111';
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows != 0 THEN
    RAISE EXCEPTION 'RLS SECURITY FAIL: Viewer escalated role to owner! Updated rows: %', updated_rows;
  END IF;
END $$;

-- Test 4: Privilege Escalation Guard Test - Agricultor attempting to elevate role to admin_tenant
SET LOCAL request.jwt.claims = '{"app_metadata": {"tenant_id": "22222222-2222-2222-2222-222222222222", "role": "agricultor"}}';

DO $$
DECLARE
  updated_rows integer;
BEGIN
  UPDATE users SET role = 'admin_tenant' WHERE id = 'b2222222-2222-2222-2222-222222222222';
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows != 0 THEN
    RAISE EXCEPTION 'RLS SECURITY FAIL: Agricultor escalated role to admin_tenant! Updated rows: %', updated_rows;
  END IF;
END $$;

-- Test 5: Verify Anonymous reads 0 predios
SET LOCAL ROLE anon;

DO $$
DECLARE
  predio_count integer;
BEGIN
  SELECT count(*) INTO predio_count FROM predios;
  IF predio_count != 0 THEN
    RAISE EXCEPTION 'RLS FAIL: Anon user should see 0 predios, saw %', predio_count;
  END IF;
END $$;

ROLLBACK;
